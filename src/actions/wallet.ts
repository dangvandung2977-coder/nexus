"use server";

import { createClient } from "@/lib/supabase/server";
import type { CreditWallet, CreditTransaction } from "@/types";

/**
 * Fetches the current user's wallet, creating one if it doesn't exist yet.
 * All mutations are handled by the database RPC to prevent race conditions.
 */
export async function getWallet(): Promise<{ wallet: CreditWallet | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { wallet: null, error: "Unauthorized" };

  // Try to fetch existing wallet
  // @ts-ignore – tables added via migration
  let { data: wallet } = await supabase
    .from("credit_wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Create wallet if it doesn't exist (safe upsert)
  if (!wallet) {
    // @ts-ignore – tables added via migration
    const { data: newWallet, error } = await supabase
      .from("credit_wallets")
      .insert({ user_id: user.id, balance: 0 })
      .select()
      .single();
    if (error) return { wallet: null, error: error.message };
    wallet = newWallet as unknown as typeof wallet;
  }

  return { wallet: wallet as CreditWallet };
}

/**
 * Returns recent credit transactions for the current user, newest first.
 */
export async function getTransactionHistory(
  limit = 20
): Promise<{ transactions: CreditTransaction[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [], error: "Unauthorized" };

  // @ts-ignore – tables added via migration
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { transactions: [], error: error.message };
  return { transactions: (data ?? []) as CreditTransaction[] };
}

/**
 * SERVER-ONLY: Adjust a user's credit balance safely via the DB RPC.
 * This is the single trusted entry point for all credit mutations.
 * Never expose this directly to client components.
 *
 * @param userId   - The target user's ID
 * @param amount   - Positive to add credits, negative to subtract
 * @param type     - Transaction type
 * @param note     - Human-readable description
 */
export async function adjustCredits(
  userId: string,
  amount: number,
  type: CreditTransaction["type"],
  note?: string,
  refType?: string,
  refId?: string
): Promise<{ balance?: number; error?: string }> {
  const supabase = await createClient();

  // @ts-ignore – RPC added via migration
  const { data, error } = await supabase.rpc("adjust_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_note: note ?? null,
    p_ref_type: refType ?? null,
    p_ref_id: refId ?? null,
  });

  if (error) return { error: error.message };
  const result = data as { balance?: number; error?: string };
  if (result?.error) return { error: result.error };
  return { balance: result?.balance };
}
