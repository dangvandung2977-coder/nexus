"use server";

import { createClient } from "@/lib/supabase/server";
import { getWallet, adjustCredits } from "./wallet";
import { parseFile, countTranslatableLines, calculateCreditCost, processTranslation } from "@/lib/translation";
import { revalidatePath } from "next/cache";
import { STORAGE_BUCKETS, TRANSLATION_CONFIG } from "@/lib/constants";

const ALLOWED_EXTENSIONS = ['.yml', '.yaml', '.json', '.lang', '.properties'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MIME_MAP: Record<string, string> = {
  '.yml': 'application/x-yaml',
  '.yaml': 'application/x-yaml',
  '.json': 'application/json',
  '.lang': 'text/plain',
  '.properties': 'text/plain',
};

export interface EstimateResult {
  translatableLineCount: number;
  estimatedCreditCost: number;
  fileSize: number;
  fileName: string;
}

export async function estimateTranslation(formData: FormData): Promise<{ data?: EstimateResult; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Unauthorized" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided" };
  }

  const fileName = file.name.toLowerCase();
  const ext = '.' + fileName.split('.').pop();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be under 10MB" };
  }

  const content = await file.text();
  const parsed = parseFile(content, file.name);
  const lineCount = countTranslatableLines(parsed);
  const creditCost = await calculateCreditCost(lineCount);

  return {
    data: {
      translatableLineCount: lineCount,
      estimatedCreditCost: creditCost,
      fileSize: file.size,
      fileName: file.name
    }
  };
}

export async function startTranslation(
  file: File,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ 
  jobId?: string; 
  output?: string; 
  downloadUrl?: string; 
  size?: number;
  error?: string; 
  required?: number 
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Unauthorized" };
  }

  const fileName = file.name.toLowerCase();
  const ext = '.' + fileName.split('.').pop();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { error: `Unsupported file type` };
  }

  const content = await file.text();
  const parsed = parseFile(content, file.name);
  const lineCount = countTranslatableLines(parsed);
  const creditCost = await calculateCreditCost(lineCount);

  console.log("[Translation] Debug:", { lineCount, creditCost, file: file.name, rate: TRANSLATION_CONFIG.CREDIT_RATE });

  if (creditCost === 0) {
    return { error: "No translatable content found in file" };
  }

  const { wallet, error: walletError } = await getWallet();
  if (walletError || !wallet) {
    return { error: "Unable to verify wallet" };
  }

  if (Number(wallet.balance) < creditCost) {
    return { 
      error: `Insufficient credits. Need ${creditCost} credits, but you only have ${Number(wallet.balance)}`,
      required: creditCost
    };
  }

  const userId = user.id;
  const filePath = `${userId}/${Date.now()}_${file.name}`;
  
  // Convert File to Uint8Array to strip "sticky" MIME types from the browser
  const arrayBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);
  const contentType = MIME_MAP[ext] || 'text/plain';

  const { error: uploadError } = await supabase.storage
    .from('translations')
    .upload(filePath, fileData, {
      contentType,
      upsert: true
    });
    
  if (uploadError) {
    return { error: "Failed to upload file: " + uploadError.message };
  }

  const { error: deductError } = await adjustCredits(
    userId,
    -creditCost,
    "translation_cost",
    `Translation: ${file.name} (${lineCount} lines)`,
    "translation"
  );

  if (deductError) {
    await supabase.storage.from('translations').remove([filePath]);
    return { error: "Failed to deduct credits: " + deductError };
  }

  const { data: job, error: jobError } = await supabase
    .from("translation_jobs")
    .// @ts-ignore
    insert({
      user_id: userId,
      status: "processing",
      source_language: sourceLanguage,
      target_language: targetLanguage,
      input_file_path: filePath,
      original_filename: file.name,
      credit_cost: creditCost,
      translatable_line_count: lineCount,
      translated_line_count: 0,
      file_size: file.size,
    })
    .select()
    .single();

  if (jobError) {
    await supabase.storage.from('translations').remove([filePath]);
    return { error: "Failed to create translation job: " + jobError.message };
  }

  const jobId = (job as any).id;

  try {
    const { output, translatedCount } = await processTranslation(job as any, content);
    
    const translatedFileName = file.name.replace(/\.[^.]+$/, `.${targetLanguage}.$&`);
    const outputPath = `${userId}/${Date.now()}_${translatedFileName}`;
    
    const { error: outputError } = await supabase.storage
      .from('translations')
      .upload(outputPath, output, { contentType: 'text/plain' });
    
    if (outputError) {
      await supabase
        .from("translation_jobs")
        .// @ts-ignore
        update({ status: "failed", error_message: "Failed to save output" })
        .eq("id", jobId);
      return { error: "Failed to save translation output" };
    }

    await supabase
      .from("translation_jobs")
      .// @ts-ignore
      update({ 
        status: "done", 
        output_file_path: outputPath,
        translated_filename: translatedFileName,
        translated_line_count: translatedCount,
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);

    revalidatePath("/dashboard/translations");
    
    // Generate signed URL immediately for a better UX
    const { data: signedUrlData } = await supabase.storage
      .from('translations')
      .createSignedUrl(outputPath, 3600, {
        download: translatedFileName
      });
    
    return { 
      jobId, 
      output, 
      downloadUrl: signedUrlData?.signedUrl,
      size: Buffer.byteLength(output, 'utf8')
    };
  } catch (error: any) {
    await supabase
      .from("translation_jobs")
      .// @ts-ignore
      update({ status: "failed", error_message: error.message })
      .eq("id", jobId);
    
    return { error: "Translation failed: " + error.message };
  }
}

export async function getTranslationJobs(): Promise<{ jobs: any[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { jobs: [], error: "Unauthorized" };
  }

  // @ts-ignore
  const { data, error } = await supabase
    .from("translation_jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { jobs: [], error: error.message };
  return { jobs: data ?? [] };
}

export async function getTranslationJob(jobId: string): Promise<{ job: any; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { job: null, error: "Unauthorized" };
  }

  // @ts-ignore
  const { data, error } = await supabase
    .from("translation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error) return { job: null, error: error.message };
  return { job: data };
}

export async function downloadTranslation(jobId: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Unauthorized" };
  }

  // @ts-ignore
  const { data: job, error } = await supabase
    .from("translation_jobs")
    // @ts-ignore
    .select("output_file_path, translated_filename, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (error || !job) {
    return { error: "Job not found" };
  }

  const jobData = job as any;

  if (jobData.status !== "done" || !jobData.output_file_path) {
    return { error: "Translation not ready" };
  }

  const { data: signedUrl } = await supabase.storage
    .from('translations')
    .createSignedUrl(jobData.output_file_path, 60, {
      download: jobData.translated_filename
    });

  if (!signedUrl) {
    return { error: "Failed to generate download URL" };
  }

  return { url: signedUrl.signedUrl };
}

export async function deleteTranslation(jobId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get job details to find file paths
  const { data: job, error: fetchError } = await supabase
    .from("translation_jobs")
    .select("input_file_path, output_file_path")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !job) {
    return { error: "Không tìm thấy bản dịch hoặc bạn không có quyền xóa: " + (fetchError?.message || "Not found") };
  }

  const jobData = job as any;
  const filesToDelete = [];
  if (jobData.input_file_path) filesToDelete.push(jobData.input_file_path);
  if (jobData.output_file_path) filesToDelete.push(jobData.output_file_path);

  // Delete files from storage
  if (filesToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("translations")
      .remove(filesToDelete);
    
    if (storageError) {
      console.error("Storage deletion error:", storageError);
    }
  }

  // Delete DB record
  const { error: deleteError } = await supabase
    .from("translation_jobs")
    .delete()
    .eq("id", jobId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: "Lỗi xóa cơ sở dữ liệu: " + deleteError.message };
  }

  revalidatePath("/dashboard/translations");
  return { success: true };
}