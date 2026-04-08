import { ArrowUpRight, ArrowDownLeft, Coins, Zap, RefreshCcw, Shield, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { CreditTransaction, TransactionType } from "@/types";
import { cn } from "@/lib/utils";

const TX_CONFIG: Record<TransactionType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}> = {
  daily_reward: {
    label: "Daily Reward",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  download_cost: {
    label: "Download",
    icon: ArrowDownLeft,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
  translation_cost: {
    label: "Translation",
    icon: Coins,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  admin_adjust: {
    label: "Adjustment",
    icon: Settings2,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
  refund: {
    label: "Refund",
    icon: RefreshCcw,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
};

interface TransactionListProps {
  transactions: CreditTransaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center">
        <Coins className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-sm">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Claim your first daily reward to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((tx) => {
        const config = TX_CONFIG[tx.type] ?? TX_CONFIG.admin_adjust;
        const Icon = config.icon;
        const isPositive = tx.amount > 0;

        return (
          <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
            {/* Icon */}
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bgColor)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{config.label}</p>
              {tx.note && (
                <p className="text-xs text-muted-foreground truncate">{tx.note}</p>
              )}
            </div>

            {/* Right side */}
            <div className="text-right shrink-0">
              <p className={cn(
                "text-sm font-semibold tabular-nums",
                isPositive ? "text-emerald-500" : "text-red-400"
              )}>
                {isPositive ? "+" : ""}{tx.amount.toFixed(0)} credits
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDate(tx.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
