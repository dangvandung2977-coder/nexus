"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess, canChangeSettings } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { getAllSettings, updateSetting, type AppSetting } from "@/lib/admin/settings";

export async function getAdminSettings(): Promise<{
  settings: AppSetting[];
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { settings: [], error: "Unauthorized" };
  }

  const settings = await getAllSettings();
  return { settings };
}

export async function getSettingsByCategory(category: string): Promise<{
  settings: AppSetting[];
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { settings: [], error: "Unauthorized" };
  }

  const settings = await getAllSettings(category as AppSetting["category"]);
  return { settings };
}

export async function updateAdminSetting(
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canChangeSettings(admin.user.role)) {
    return { success: false, error: "Only admins can change settings" };
  }

  const result = await updateSetting(key, value, admin.user.id);

  if (result.success) {
    await createAuditLog({
      adminId: admin.user.id,
      actionType: "settings_change",
      targetType: "settings",
      targetId: key,
      targetName: key,
      note: `Setting '${key}' updated`,
      metadata: { key, value }
    });

    revalidatePath("/admin/settings");
  }

  return result;
}

export async function updateMultipleSettings(
  settings: { key: string; value: unknown }[]
): Promise<{ success: boolean; errors: string[] }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canChangeSettings(admin.user.role)) {
    return { success: false, errors: ["Unauthorized"] };
  }

  const errors: string[] = [];

  for (const setting of settings) {
    const result = await updateSetting(setting.key, setting.value, admin.user.id);
    if (!result.success && result.error) {
      errors.push(`${setting.key}: ${result.error}`);
    } else if (result.success) {
      await createAuditLog({
        adminId: admin.user.id,
        actionType: "settings_change",
        targetType: "settings",
        targetId: setting.key,
        targetName: setting.key,
        note: `Setting '${setting.key}' updated`,
        metadata: { key: setting.key, value: setting.value }
      });
    }
  }

  revalidatePath("/admin/settings");

  return { success: errors.length === 0, errors };
}

export interface RewardSettings {
  daily_checkin_base_credit: number;
  streak_enabled: boolean;
  streak_bonus_credit: number;
  streak_milestone_3: number;
  streak_milestone_7: number;
  streak_milestone_14: number;
  streak_milestone_30: number;
  max_daily_reward_cap: number;
}

export interface TranslationSettings {
  translation_credits_per_line: number;
  translation_min_charge: number;
  translation_max_free_lines: number;
}

export interface EconomySettings {
  download_credit_enabled: boolean;
  download_default_credit_cost: number;
}

export async function getRewardSettings(): Promise<{
  settings: RewardSettings;
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { settings: {} as RewardSettings, error: "Unauthorized" };
  }

  const settings = await getAllSettings("rewards");
  
  const rewardSettings: RewardSettings = {
    daily_checkin_base_credit: 5,
    streak_enabled: true,
    streak_bonus_credit: 1,
    streak_milestone_3: 5,
    streak_milestone_7: 15,
    streak_milestone_14: 30,
    streak_milestone_30: 50,
    max_daily_reward_cap: 0
  };

  for (const setting of settings) {
    if (setting.key in rewardSettings) {
      (rewardSettings as Record<string, unknown>)[setting.key] = setting.value;
    }
  }

  return { settings: rewardSettings };
}

export async function getTranslationSettingsAdmin(): Promise<{
  settings: TranslationSettings;
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { settings: {} as TranslationSettings, error: "Unauthorized" };
  }

  const settings = await getAllSettings("translation");
  
  const translationSettings: TranslationSettings = {
    translation_credits_per_line: 0.5,
    translation_min_charge: 1,
    translation_max_free_lines: 50
  };

  for (const setting of settings) {
    if (setting.key in translationSettings) {
      (translationSettings as Record<string, unknown>)[setting.key] = setting.value;
    }
  }

  return { settings: translationSettings };
}

export async function getEconomySettingsAdmin(): Promise<{
  settings: EconomySettings;
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { settings: {} as EconomySettings, error: "Unauthorized" };
  }

  const settings = await getAllSettings("economy");
  
  const economySettings: EconomySettings = {
    download_credit_enabled: false,
    download_default_credit_cost: 10
  };

  for (const setting of settings) {
    if (setting.key in economySettings) {
      (economySettings as Record<string, unknown>)[setting.key] = setting.value;
    }
  }

  return { settings: economySettings };
}
