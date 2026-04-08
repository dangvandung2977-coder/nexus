import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TranslationJob } from "@/types";
import { TRANSLATION_CONFIG } from "./constants";
import { createClient } from "@/lib/supabase/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const MAX_TOKENS_PER_REQUEST = parseInt(process.env.TRANSLATION_MAX_TOKENS ?? "8192");

const TRANSLATION_CREDIT_RATE = TRANSLATION_CONFIG.CREDIT_RATE;
const MAX_LINES_PER_CHUNK = TRANSLATION_CONFIG.MAX_LINES_PER_CHUNK;

interface TranslationPricing {
  creditsPerLine: number;
  minCharge: number;
  maxFreeLines: number;
}

let cachedPricing: TranslationPricing | null = null;
let pricingCacheTime = 0;
const PRICING_CACHE_TTL = 60000; // 1 minute

async function getTranslationPricing(): Promise<TranslationPricing> {
  const now = Date.now();
  if (cachedPricing && now - pricingCacheTime < PRICING_CACHE_TTL) {
    return cachedPricing;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["translation_credits_per_line", "translation_min_charge", "translation_max_free_lines"]);

    if (error || !data) {
      return {
        creditsPerLine: TRANSLATION_CREDIT_RATE,
        minCharge: 1,
        maxFreeLines: 0
      };
    }

    const settings: Record<string, number> = {};
    for (const item of data) {
      if (item.key === "translation_credits_per_line") {
        settings.creditsPerLine = parseFloat(item.value as string) || TRANSLATION_CREDIT_RATE;
      } else if (item.key === "translation_min_charge") {
        settings.minCharge = parseFloat(item.value as string) || 1;
      } else if (item.key === "translation_max_free_lines") {
        settings.maxFreeLines = parseInt(item.value as string) || 0;
      }
    }

    cachedPricing = {
      creditsPerLine: settings.creditsPerLine ?? TRANSLATION_CREDIT_RATE,
      minCharge: settings.minCharge ?? 1,
      maxFreeLines: settings.maxFreeLines ?? 0
    };
    pricingCacheTime = now;
    return cachedPricing;
  } catch {
    return {
      creditsPerLine: TRANSLATION_CREDIT_RATE,
      minCharge: 1,
      maxFreeLines: 0
    };
  }
}

export interface ParsedLine {
  key: string;
  value: string;
  lineNumber: number;
  needsTranslation: boolean;
  original: string;
}

export interface TranslationResult {
  key: string;
  original: string;
  translated: string;
  preserved: boolean;
}

const TRANSLATION_SYSTEM_PROMPT = `You are a Minecraft plugin localization expert. Your task is to translate Minecraft plugin configuration and language files from English to Vietnamese.

CRITICAL RULES:
1. PRESERVE ALL KEYS EXACTLY - Never change any key, path, or identifier
2. PRESERVE ALL PLACEHOLDERS exactly as they are:
   - %player%, %s, %1$s, %2$s, {value}, {player}, {amount}
   - <red>, <green>, <yellow>, <blue>, <gold>
   - <#FFAA00>, #FFFFFF, &a, &l, &n, &c
   - MiniMessage tags like <bold>, <italic>, <rainbow>
   - Vault placeholders like %vault_rank%, %vault_prefix%
   - any format/placeholder tokens
3. PRESERVE STRUCTURE - Keep YAML indentation, JSON structure, key=value format exactly
4. DO NOT TRANSLATE:
   - Command names (/spawn, /tpa, /home)
   - Permission nodes (plugin.admin, some.permission)
   - Material IDs (DIAMOND_SWORD, STONE, WATER)
   - Plugin identifiers
   - Enum values (true, false, null, none)
   - Configuration keys (spawn-location, enable-feature)
   - Color codes and formatting codes
   - Technical tokens
5. TRANSLATE USER-FACING TEXT naturally:
   - Use Vietnamese commonly used in Minecraft communities
   - Keep messages conversational and friendly
   - Consider context from surrounding keys

CONTEXT AWARENESS:
- Look at section headers, neighboring keys, and comments for context
- If a string contains both technical and user text, translate only the user text
- Use context to choose natural phrasing

OUTPUT FORMAT:
Return a JSON array of objects with:
- "key": the original key/identifier
- "original": the original text (for verification)
- "translated": the translated Vietnamese text (or original if should not be translated)
- "preserved": true if the line should not be translated, false otherwise

Example input line: "prefix: &8[&6Server&8] &7"
Example output: {"key": "prefix", "original": "&8[&6Server&8] &7", "translated": "&8[&6Máy Chủ&8] &7", "preserved": false}

Remember: Better to preserve (not translate) than to incorrectly translate technical content.`;

export function countTranslatableLines(lines: ParsedLine[]): number {
  return lines.filter(line => line.needsTranslation).length;
}

export async function calculateCreditCost(lineCount: number): Promise<number> {
  const pricing = await getTranslationPricing();
  const chargeableLines = Math.max(0, lineCount - pricing.maxFreeLines);
  const cost = chargeableLines * pricing.creditsPerLine;
  return Math.max(pricing.minCharge, Math.ceil(cost));
}

function createGenAI(): GoogleGenerativeAI | null {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not configured");
    return null;
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

export async function translateWithGemini(
  lines: ParsedLine[],
  targetLanguage: string = "vi"
): Promise<TranslationResult[]> {
  const genAI = createGenAI();
  if (!genAI) {
    throw new Error("Translation service not configured");
  }

  const translatableLines = lines.filter(l => l.needsTranslation);
  if (translatableLines.length === 0) {
    return lines.map(l => ({
      key: l.key,
      original: l.value,
      translated: l.value,
      preserved: true
    }));
  }

  const results: TranslationResult[] = [];
  
  for (let i = 0; i < translatableLines.length; i += MAX_LINES_PER_CHUNK) {
    const chunk = translatableLines.slice(i, i + MAX_LINES_PER_CHUNK);
    
    const prompt = `Translate the following ${targetLanguage === 'vi' ? 'to Vietnamese' : `to ${targetLanguage}`} Minecraft plugin lines.
Only translate user-facing messages, NOT keys or placeholders.

Lines to translate (key=value format):
${chunk.map(l => `${l.key}=${l.value}`).join('\n')}

Return a JSON array with: key, original, translated, preserved fields.`;

    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: MAX_TOKENS_PER_REQUEST,
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent([
      { text: TRANSLATION_SYSTEM_PROMPT },
      { text: prompt }
    ]);

    const responseText = result.response.text();
    
    try {
      const parsed = JSON.parse(responseText);
      const chunkResults = Array.isArray(parsed) ? parsed : [parsed];
      results.push(...chunkResults.map((r: any) => ({
        key: r.key,
        original: r.original,
        translated: r.translated || r.original,
        preserved: r.preserved ?? false
      })));
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      chunk.forEach(l => {
        results.push({
          key: l.key,
          original: l.value,
          translated: l.value,
          preserved: true
        });
      });
    }
  }

  const resultMap = new Map(results.map(r => [r.key, r]));
  
  return lines.map(line => {
    if (resultMap.has(line.key)) {
      return resultMap.get(line.key)!;
    }
    return {
      key: line.key,
      original: line.value,
      translated: line.value,
      preserved: true
    };
  });
}

export function parseYAML(content: string): ParsedLine[] {
  const lines = content.split('\n');
  const results: ParsedLine[] = [];
  let currentKey = '';
  let currentValue = '';
  let indentStack: number[] = [0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNumber = i + 1;

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value && !value.startsWith('#')) {
        const needsTranslation = shouldTranslateValue(value);
        results.push({
          key,
          value,
          lineNumber,
          needsTranslation,
          original: trimmed
        });
      } else if (!value) {
        currentKey = key;
      }
    } else if (trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const value = parts[1]?.trim();
      if (value) {
        const needsTranslation = shouldTranslateValue(value);
        results.push({
          key: currentKey ? `${currentKey}.${key}` : key,
          value,
          lineNumber,
          needsTranslation,
          original: trimmed
        });
      }
    }
  }

  return results;
}

export function parseJSON(content: string): ParsedLine[] {
  const results: ParsedLine[] = [];
  
  try {
    const parsed = JSON.parse(content);
    parseJSONRecursive(parsed, '', results);
  } catch {
    return results;
  }

  return results;
}

function parseJSONRecursive(obj: any, prefix: string, results: ParsedLine[]): void {
  if (typeof obj === 'string') {
    if (prefix && shouldTranslateValue(obj)) {
      results.push({
        key: prefix,
        value: obj,
        lineNumber: 0,
        needsTranslation: true,
        original: `"${obj}"`
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      parseJSONRecursive(item, `${prefix}[${index}]`, results);
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      parseJSONRecursive(value, newPrefix, results);
    });
  }
}

export function parseLangFile(content: string): ParsedLine[] {
  const lines = content.split('\n');
  const results: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();

      if (value) {
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }

        const needsTranslation = shouldTranslateValue(value);
        results.push({
          key,
          value,
          lineNumber,
          needsTranslation,
          original: line
        });
      }
    }
  }

  return results;
}

export function parsePropertiesFile(content: string): ParsedLine[] {
  return parseLangFile(content);
}

export function parseFile(content: string, filename: string): ParsedLine[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'yml':
    case 'yaml':
      return parseYAML(content);
    case 'json':
      return parseJSON(content);
    case 'lang':
      return parseLangFile(content);
    case 'properties':
      return parsePropertiesFile(content);
    default:
      return parseYAML(content);
  }
}

function shouldTranslateValue(value: string): boolean {
  if (!value || value.length === 0) return false;
  
  const valueLower = value.toLowerCase();
  
  if (valueLower === 'true' || valueLower === 'false' || valueLower === 'null' || valueLower === 'none') {
    return false;
  }
  
  if (value.match(/^[a-z_]+\.[a-z_]+$/i) && !value.includes(' ')) {
    return false;
  }
  
  if (value.match(/^[\/\-]?[a-z]+$/i)) {
    return false;
  }
  
  if (value.match(/^(&[0-9a-fkrlmon]|<[^>]*>|#[0-9a-fA-F]{6})/)) {
    if (!value.match(/[a-zA-Z]{4,}/)) {
      return false;
    }
  }
  
  if (value.match(/^(https?:\/\/|www\.)/)) {
    return false;
  }
  
  if (value.match(/^%[a-z_]+%$|^%[0-9]+\$[sdf]%$/)) {
    return false;
  }
  
  if (value.match(/^\d+(\.\d+)?$/)) {
    return false;
  }

  return value.match(/[a-zA-Z]{3,}/) !== null;
}

export function reconstructYAML(results: TranslationResult[], originalContent: string): string {
  const lines = originalContent.split('\n');
  const resultMap = new Map(results.map(r => [r.key, r]));
  
  const output: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      output.push(line);
      continue;
    }
    
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (value && !value.startsWith('#')) {
        const result = resultMap.get(key);
        if (result && !result.preserved) {
          output.push(`${key}: ${result.translated}`);
          continue;
        }
      }
    }
    
    output.push(line);
  }
  
  return output.join('\n');
}

export function reconstructJSON(results: TranslationResult[], originalContent: string): string {
  try {
    const parsed = JSON.parse(originalContent);
    const resultMap = new Map(results.filter(r => !r.preserved).map(r => [r.key, r.translated]));
    
    applyJSONTranslations(parsed, resultMap);
    
    return JSON.stringify(parsed, null, 2);
  } catch {
    return originalContent;
  }
}

function applyJSONTranslations(obj: any, translations: Map<string, string>): void {
  if (typeof obj === 'string') {
    return;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach(item => applyJSONTranslations(item, translations));
    return;
  }
  
  if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = key;
      
      if (typeof value === 'string' && translations.has(fullKey)) {
        obj[key] = translations.get(fullKey);
      } else if (typeof value === 'object') {
        applyJSONTranslations(value, translations);
      }
    });
  }
}

export function reconstructLangFile(results: TranslationResult[], originalContent: string): string {
  const lines = originalContent.split('\n');
  const resultMap = new Map(results.filter(r => !r.preserved).map(r => [r.key, r.translated]));
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      output.push(line);
      continue;
    }
    
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      const translated = resultMap.get(key);
      
      if (translated !== undefined) {
        output.push(`${key}=${translated}`);
        continue;
      }
    }
    
    output.push(line);
  }
  
  return output.join('\n');
}

export function reconstructFile(results: TranslationResult[], content: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'yml':
    case 'yaml':
      return reconstructYAML(results, content);
    case 'json':
      return reconstructJSON(results, content);
    case 'lang':
    case 'properties':
      return reconstructLangFile(results, content);
    default:
      return reconstructYAML(results, content);
  }
}

export async function processTranslation(
  job: TranslationJob,
  inputContent: string
): Promise<{ output: string; translatedCount: number }> {
  const lines = parseFile(inputContent, job.original_filename);
  const translatableCount = countTranslatableLines(lines);
  
  if (translatableCount === 0) {
    return {
      output: inputContent,
      translatedCount: 0
    };
  }
  
  const translationResults = await translateWithGemini(lines, job.target_language);
  
  const translatedCount = translationResults.filter(r => !r.preserved).length;
  const output = reconstructFile(translationResults, inputContent, job.original_filename);
  
  return {
    output,
    translatedCount
  };
}