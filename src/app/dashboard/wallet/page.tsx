import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coins, TrendingUp, ArrowUpRight } from "lucide-react";
import { getWallet, getTransactionHistory } from "@/actions/wallet";
import { getCheckinStatus } from "@/actions/checkin";
import { TransactionList } from "@/components/wallet/TransactionList";
import { DailyCheckin } from "@/components/dashboard/DailyCheckin";

export const metadata: Metadata = { title: "Wallet — Dashboard" };

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ wallet }, { transactions }, checkinStatus] = await Promise.all([
    getWallet(),
    getTransactionHistory(30),
    getCheckinStatus(),
  ]);

  const balance = wallet?.balance ?? 0;

  // Simple stats
  const totalEarned = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your credits and view transaction history.
        </p>
      </div>

      {/* Balance + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Main balance card */}
        <div className="md:col-span-2 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Coins className="w-4 h-4" />
              Current Balance
            </div>
            <p className="text-5xl font-bold tracking-tight">
              {Math.floor(balance).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">credits</p>
          </div>
        </div>

        {/* Earned / Spent */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Total Earned
            </div>
            <p className="text-2xl font-bold text-emerald-500">+{Math.floor(totalEarned)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-red-400" /> Total Spent
            </div>
            <p className="text-2xl font-bold text-red-400">-{Math.floor(totalSpent)}</p>
          </div>
        </div>
      </div>

      {/* Daily Check-in */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Daily Reward
        </h2>
        <DailyCheckin initialStatus={checkinStatus} />
      </div>

      {/* Transaction History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Transaction History</h2>
          <span className="text-xs text-muted-foreground">{transactions.length} records</span>
        </div>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  );
}
