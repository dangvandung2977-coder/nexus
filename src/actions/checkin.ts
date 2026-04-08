"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getSettingWithDefault } from "@/lib/admin/settings";
import type { DailyCheckin } from "@/types";

export interface CheckinStatus {
  claimedToday: boolean;
  streak: number;
  lastCheckin: string | null;
  rewardAmount: number;
}

export interface ClaimResult {
  success: boolean;
  alreadyClaimed?: boolean;
  reward?: number;
  streak?: number;
  newBalance?: number;
  error?: string;
}

/**
 * Returns whether the current user has claimed today's reward
 * and their current streak. Safe to call from server components.
 */
export async function getCheckinStatus(): Promise<CheckinStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const baseReward = await getSettingWithDefault("daily_checkin_base_credit", 5);

  if (!user) {
    return { claimedToday: false, streak: 0, lastCheckin: null, rewardAmount: baseReward };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: lastCheckin } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .order("checkin_date", { ascending: false })
    .limit(1)
    .single();

  const lastCheck = lastCheckin as unknown as DailyCheckin | null;
  const claimedToday = lastCheck?.checkin_date === today;
  const streak = claimedToday ? lastCheck!.streak : 0;

  return {
    claimedToday,
    streak,
    lastCheckin: lastCheck?.checkin_date ?? null,
    rewardAmount: baseReward,
  };
}

/**
 * Claims the daily reward for the authenticated user.
 * Delegates to a SECURITY DEFINER RPC so the logic and
 * duplicate-prevention happen atomically in the database.
 */
export async function claimDailyReward(): Promise<ClaimResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in to claim rewards." };

  // @ts-ignore – RPC added via migration
  const { data, error } = await supabase.rpc("claim_daily_reward", {
    p_user_id: user.id,
  });

  if (error) return { success: false, error: error.message };

  const result = data as {
    claimed?: boolean;
    reward?: number;
    streak?: number;
    balance?: string;
    error?: string;
    message?: string;
  };

  if (result?.error === "already_claimed") {
    return { success: false, alreadyClaimed: true };
  }

  if (result?.error) {
    return { success: false, error: result.message ?? result.error };
  }

  // Invalidate wallet page cache so router.refresh() sees fresh data
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");

  return {
    success: true,
    reward: result?.reward,
    streak: result?.streak,
    newBalance: result?.balance ? parseFloat(result.balance) : undefined,
  };
}
