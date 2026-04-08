"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess, canAdjustCredits } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { Database } from "@/types/database.types";

export type TransactionType = Database["public"]["Tables"]["credit_transactions"]["Row"]["type"];

export interface CreditTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  created_at: string;
}

export interface WalletWithProfile {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export interface ListWalletsParams {
  page?: number;
  limit?: number;
  search?: string;
  minBalance?: number;
  maxBalance?: number;
  sortBy?: "balance" | "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export async function listWallets(params: ListWalletsParams = {}) {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { error: "Unauthorized", wallets: [], total: 0 };
  }

  const supabase = await createClient();
  const { page = 1, limit = 20, search, minBalance, maxBalance, sortBy = "balance", sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("credit_wallets")
    .select(`
      *,
      profile:profiles!user_id (
        username,
        display_name,
        avatar_url,
        status
      )
    `, { count: "exact" });

  if (search) {
    query = query.or(
      `profile.username.ilike.%${search}%,profile.display_name.ilike.%${search}%`
    );
  }
  if (minBalance !== undefined) {
    query = query.gte("balance", minBalance);
  }
  if (maxBalance !== undefined) {
    query = query.lte("balance", maxBalance);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { error: error.message, wallets: [], total: 0 };
  }

  return { wallets: data as WalletWithProfile[], total: count || 0 };
}

export async function getWallet(userId: string): Promise<{
  wallet: WalletWithProfile | null;
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { wallet: null, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credit_wallets")
    .select(`
      *,
      profile:profiles!user_id (
        id,
        username,
        display_name,
        avatar_url,
        status,
        role
      )
    `)
    .eq("user_id", userId)
    .single();

  if (error) {
    return { wallet: null, error: "Wallet not found" };
  }

  return { wallet: data as WalletWithProfile };
}

export async function getTransactionHistory(
  userId: string,
  options: { page?: number; limit?: number; type?: TransactionType } = {}
): Promise<{ transactions: CreditTransaction[]; total: number }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { transactions: [], total: 0 };
  }

  const supabase = await createClient();
  const { page = 1, limit = 50, type } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("credit_transactions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error, count } = await query;

  if (error) {
    return { transactions: [], total: 0 };
  }

  return { transactions: data as CreditTransaction[], total: count || 0 };
}

export async function adjustCredits(
  userId: string,
  amount: number,
  note: string,
  type: "admin_adjust" | "refund" = "admin_adjust"
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canAdjustCredits(admin.user.role)) {
    return { success: false, error: "Only admins can adjust credits" };
  }

  if (amount === 0) {
    return { success: false, error: "Amount cannot be zero" };
  }

  if (amount < 0) {
    const supabase = await createClient();
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .single() as { data: { balance: number } | null };

    if (wallet && (wallet.balance) + amount < 0) {
      return { success: false, error: "Insufficient balance for this deduction" };
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("adjust_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_note: note,
    p_admin_id: admin.user.id
  } as any);

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { balance?: number; error?: string };
  if (result.error) {
    return { success: false, error: result.error };
  }

  await createAuditLog({
    adminId: admin.user.id,
    actionType: type === "refund" ? "refund" : "credit_adjust",
    targetType: "user",
    targetId: userId,
    note,
    metadata: {
      amount,
      newBalance: result.balance,
      type
    }
  });

  revalidatePath("/admin/credits");
  revalidatePath(`/admin/users/${userId}`);

  return { success: true, newBalance: result.balance };
}

export async function getPlatformCreditStats(): Promise<{
  totalCreditsInCirculation: number;
  totalTransactions: number;
  totalAdjustments: number;
  totalRefunds: number;
  todayTransactions: number;
} | null> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return null;
  }

  const supabase = await createClient();

  const { data: wallets } = await supabase
    .from("credit_wallets")
    .select("balance");

  const { count: totalTx } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true });

  const { count: adjustments } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true })
    .eq("type", "admin_adjust");

  const { count: refunds } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true })
    .eq("type", "refund");

  const today = new Date().toISOString().split("T")[0];
  const { count: todayTx } = await supabase
    .from("credit_transactions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today);

  return {
    totalCreditsInCirculation: (wallets as any[])?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0,
    totalTransactions: totalTx || 0,
    totalAdjustments: adjustments || 0,
    totalRefunds: refunds || 0,
    todayTransactions: todayTx || 0
  };
}
