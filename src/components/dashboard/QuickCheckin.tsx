"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimDailyReward, getCheckinStatus } from "@/actions/checkin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CheckinStatus } from "@/actions/checkin";

/**
 * Compact check-in strip for the Explore page header.
 * Fetches own status on mount then lets the user claim inline.
 */
export function QuickCheckin() {
  const router = useRouter();
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getCheckinStatus().then(setStatus);
  }, []);

  const handleClaim = () => {
    startTransition(async () => {
      const result = await claimDailyReward();
      if (result.alreadyClaimed) {
        toast.info("Already claimed today!");
        setStatus((prev) => prev ? { ...prev, claimedToday: true } : prev);
        return;
      }
      if (result.error) { toast.error(result.error); return; }
      if (result.success) {
        toast.success(`+${result.reward} credits! 🎉 Day ${result.streak} streak`);
        setStatus((prev) => prev
          ? { ...prev, claimedToday: true, streak: result.streak ?? prev.streak }
          : prev
        );
        router.refresh();
      }
    });
  };

  // Don't render while loading or if no user
  if (!status) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm transition-all",
      status.claimedToday
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-primary/25 bg-primary/5"
    )}>
      {/* Streak flame */}
      {status.streak > 0 && (
        <div className="flex items-center gap-1 text-orange-400 shrink-0">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{status.streak}d</span>
        </div>
      )}

      <span className="text-muted-foreground text-xs hidden sm:block">
        {status.claimedToday ? "Reward claimed today" : `Claim your +${status.rewardAmount} daily credits`}
      </span>

      {status.claimedToday ? (
        <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 ml-auto">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Claimed</span>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={isPending}
          className="ml-auto h-7 text-xs px-3 gap-1 shadow-sm shadow-primary/15"
        >
          {isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Zap className="w-3 h-3" />}
          {isPending ? "..." : `+${status.rewardAmount}`}
        </Button>
      )}
    </div>
  );
}
