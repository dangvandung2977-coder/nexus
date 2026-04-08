import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

export type SettingCategory = "rewards" | "economy" | "translation" | "moderation" | "general";
export type SettingValueType = "string" | "number" | "boolean" | "json";

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  value_type: SettingValueType;
  description: string | null;
  category: SettingCategory;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface GetSettingOptions {
  category?: SettingCategory;
  throwIfMissing?: boolean;
}

export async function getSetting(key: string): Promise<unknown | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, value_type")
    .eq("key", key)
    .single();
  
  if (error || !data) return null;
  
  return convertSettingValue(data.value, data.value_type);
}

export async function getSettingWithDefault<T>(key: string, defaultValue: T): Promise<T> {
  const value = await getSetting(key);
  if (value === null) return defaultValue;
  return value as T;
}

export async function getAllSettings(category?: SettingCategory): Promise<AppSetting[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from("app_settings")
    .select("*")
    .order("category", { ascending: true })
    .order("key", { ascending: true });
  
  if (category) {
    query = query.eq("category", category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching settings:", error);
    return [];
  }
  
  return data.map(setting => ({
    ...setting,
    value: convertSettingValue(setting.value, setting.value_type)
  })) as AppSetting[];
}

export async function updateSetting(
  key: string,
  value: unknown,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const valueType = getValueType(value);
  
  const { error } = await supabase
    .from("app_settings")
    .update({
      value: value as Database["public"]["Tables"]["app_settings"]["Insert"]["value"],
      updated_by: adminId,
      updated_at: new Date().toISOString()
    })
    .eq("key", key);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function updateSettings(
  settings: { key: string; value: unknown }[],
  adminId: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (const setting of settings) {
    const result = await updateSetting(setting.key, setting.value, adminId);
    if (!result.success && result.error) {
      errors.push(`${setting.key}: ${result.error}`);
    }
  }
  
  return { success: errors.length === 0, errors };
}

export async function getRewardSettings() {
  const [baseCredit, streakEnabled, streakBonus, maxCap] = await Promise.all([
    getSettingWithDefault<number>("daily_checkin_base_credit", 5),
    getSettingWithDefault<boolean>("streak_enabled", true),
    getSettingWithDefault<number>("streak_bonus_credit", 1),
    getSettingWithDefault<number>("max_daily_reward_cap", 0)
  ]);
  
  const milestones = await Promise.all([
    getSettingWithDefault<number>("streak_milestone_3", 5),
    getSettingWithDefault<number>("streak_milestone_7", 15),
    getSettingWithDefault<number>("streak_milestone_14", 30),
    getSettingWithDefault<number>("streak_milestone_30", 50)
  ]);
  
  return {
    baseCredit,
    streakEnabled,
    streakBonus,
    maxCap,
    milestones: {
      day3: milestones[0],
      day7: milestones[1],
      day14: milestones[2],
      day30: milestones[3]
    }
  };
}

export async function getTranslationSettings() {
  const [creditsPerLine, minCharge, maxFreeLines] = await Promise.all([
    getSettingWithDefault<number>("translation_credits_per_line", 0.5),
    getSettingWithDefault<number>("translation_min_charge", 1),
    getSettingWithDefault<number>("translation_max_free_lines", 50)
  ]);
  
  return {
    creditsPerLine,
    minCharge,
    maxFreeLines
  };
}

export async function getEconomySettings() {
  const [creditEnabled, defaultCost] = await Promise.all([
    getSettingWithDefault<boolean>("download_credit_enabled", false),
    getSettingWithDefault<number>("download_default_credit_cost", 10)
  ]);
  
  return {
    creditEnabled,
    defaultCost
  };
}

function convertSettingValue(value: unknown, valueType: SettingValueType): unknown {
  if (valueType === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    if (Array.isArray(value)) return value[0] === true;
    return Boolean(value);
  }
  
  if (valueType === "number") {
    if (typeof value === "number") return value;
    return parseFloat(String(value)) || 0;
  }
  
  return value;
}

function getValueType(value: unknown): SettingValueType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (typeof value === "object") return "json";
  return "string";
}
