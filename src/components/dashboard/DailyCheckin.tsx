"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Gift, CheckCircle2, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimDailyReward } from "@/actions/checkin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CheckinStatus } from "@/actions/checkin";

interface DailyCheckinProps {
  initialStatus: CheckinStatus;
}

export function DailyCheckin({ initialStatus }: DailyCheckinProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  const handleClaim = () => {
    startTransition(async () => {
      const result = await claimDailyReward();

      if (result.alreadyClaimed) {
        toast.info("You already claimed your reward today!");
        setStatus((prev) => ({ ...prev, claimedToday: true }));
        return;
      }

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.success) {
        toast.success(
          `+${result.reward} credits earned! 🎉 Day ${result.streak} streak!`,
          { duration: 4000 }
        );
        setStatus((prev) => ({
          ...prev,
          claimedToday: true,
          streak: result.streak ?? prev.streak,
        }));
        // Refresh server data so balance + transactions re-render
        router.refresh();
      }
    });
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
      status.claimedToday
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-primary/30 bg-primary/5"
    )}>
      {/* Background glow */}
      <div className={cn(
        "absolute inset-0 opacity-30 pointer-events-none",
        status.claimedToday
          ? "bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent"
          : "bg-gradient-to-br from-primary/20 via-transparent to-transparent"
      )} />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            status.claimedToday ? "bg-emerald-500/15" : "bg-primary/15"
          )}>
            {status.claimedToday
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              : <Gift className="w-5 h-5 text-primary" />
            }
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-sm">
              {status.claimedToday ? "Reward Claimed!" : "Daily Reward"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status.claimedToday
                ? "Come back tomorrow for your next reward."
                : `Claim +${status.rewardAmount} credits today`}
            </p>

            {/* Streak display */}
            {(status.streak > 0 || status.claimedToday) && (
              <div className="flex items-center gap-1 mt-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs font-medium text-orange-400">
                  {status.streak} day streak
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Button */}
        <AnimatePresence mode="wait">
          {status.claimedToday ? (
            <motion.div
              key="claimed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Claimed
            </motion.div>
          ) : (
            <motion.div key="claim" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                size="sm"
                onClick={handleClaim}
                disabled={isPending}
                className="shrink-0 h-8 text-xs gap-1.5 shadow-md shadow-primary/20"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {isPending ? "Claiming..." : `Claim +${status.rewardAmount}`}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
