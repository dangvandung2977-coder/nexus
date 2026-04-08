"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gift,
  Languages,
  CreditCard,
  Settings,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { AppSetting } from "@/lib/admin/settings";

interface AdminSettingsClientProps {
  initialSettings: AppSetting[];
  initialRewardSettings: {
    daily_checkin_base_credit: number;
    streak_enabled: boolean;
    streak_bonus_credit: number;
    streak_milestone_3: number;
    streak_milestone_7: number;
    streak_milestone_14: number;
    streak_milestone_30: number;
    max_daily_reward_cap: number;
  };
  initialTranslationSettings: {
    translation_credits_per_line: number;
    translation_min_charge: number;
    translation_max_free_lines: number;
  };
  initialEconomySettings: {
    download_credit_enabled: boolean;
    download_default_credit_cost: number;
  };
  error?: string;
}

export function AdminSettingsClient({
  initialRewardSettings,
  initialTranslationSettings,
  initialEconomySettings,
  error,
}: AdminSettingsClientProps) {
  const router = useRouter();

  const [rewardSettings, setRewardSettings] = useState(initialRewardSettings);
  const [translationSettings, setTranslationSettings] = useState(initialTranslationSettings);
  const [economySettings, setEconomySettings] = useState(initialEconomySettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateReward = (key: string, value: unknown) => {
    setRewardSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateTranslation = (key: string, value: unknown) => {
    setTranslationSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateEconomy = (key: string, value: unknown) => {
    setEconomySettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async (type: "rewards" | "translation" | "economy") => {
    setIsSubmitting(true);
    try {
      let settings: { key: string; value: unknown }[] = [];

      switch (type) {
        case "rewards":
          settings = [
            { key: "daily_checkin_base_credit", value: rewardSettings.daily_checkin_base_credit },
            { key: "streak_enabled", value: rewardSettings.streak_enabled },
            { key: "streak_bonus_credit", value: rewardSettings.streak_bonus_credit },
            { key: "streak_milestone_3", value: rewardSettings.streak_milestone_3 },
            { key: "streak_milestone_7", value: rewardSettings.streak_milestone_7 },
            { key: "streak_milestone_14", value: rewardSettings.streak_milestone_14 },
            { key: "streak_milestone_30", value: rewardSettings.streak_milestone_30 },
            { key: "max_daily_reward_cap", value: rewardSettings.max_daily_reward_cap },
          ];
          break;
        case "translation":
          settings = [
            { key: "translation_credits_per_line", value: translationSettings.translation_credits_per_line },
            { key: "translation_min_charge", value: translationSettings.translation_min_charge },
            { key: "translation_max_free_lines", value: translationSettings.translation_max_free_lines },
          ];
          break;
        case "economy":
          settings = [
            { key: "download_credit_enabled", value: economySettings.download_credit_enabled },
            { key: "download_default_credit_cost", value: economySettings.download_default_credit_cost },
          ];
          break;
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved successfully`);
        setHasChanges(false);
        router.refresh();
      } else {
        toast.error(data.errors?.[0] || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    }
    setIsSubmitting(false);
  };

  const handleReset = async (type: "rewards" | "translation" | "economy") => {
    setIsSubmitting(true);
    try {
      let settings: { key: string; value: unknown }[] = [];

      switch (type) {
        case "rewards":
          settings = [
            { key: "daily_checkin_base_credit", value: 5 },
            { key: "streak_enabled", value: true },
            { key: "streak_bonus_credit", value: 1 },
            { key: "streak_milestone_3", value: 5 },
            { key: "streak_milestone_7", value: 15 },
            { key: "streak_milestone_14", value: 30 },
            { key: "streak_milestone_30", value: 50 },
            { key: "max_daily_reward_cap", value: 0 },
          ];
          setRewardSettings(initialRewardSettings);
          break;
        case "translation":
          settings = [
            { key: "translation_credits_per_line", value: 0.5 },
            { key: "translation_min_charge", value: 1 },
            { key: "translation_max_free_lines", value: 50 },
          ];
          setTranslationSettings(initialTranslationSettings);
          break;
        case "economy":
          settings = [
            { key: "download_credit_enabled", value: false },
            { key: "download_default_credit_cost", value: 10 },
          ];
          setEconomySettings(initialEconomySettings);
          break;
      }

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} settings reset to defaults`);
        setHasChanges(false);
        router.refresh();
      } else {
        toast.error(data.errors?.[0] || "Failed to reset settings");
      }
    } catch {
      toast.error("Failed to reset settings");
    }
    setIsSubmitting(false);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive py-8">
          Error loading settings: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure platform rewards, economy, and translation settings
        </p>
      </div>

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList>
          <TabsTrigger value="rewards">
            <Gift className="w-4 h-4 mr-2" />
            Daily Rewards
          </TabsTrigger>
          <TabsTrigger value="translation">
            <Languages className="w-4 h-4 mr-2" />
            Translation
          </TabsTrigger>
          <TabsTrigger value="economy">
            <CreditCard className="w-4 h-4 mr-2" />
            Economy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Daily Check-in Rewards</CardTitle>
                  <CardDescription>
                    Configure daily check-in reward amounts and streak bonuses
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset("rewards")}
                    disabled={isSubmitting}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave("rewards")}
                    disabled={isSubmitting || !hasChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daily_checkin_base_credit">Base Daily Reward (credits)</Label>
                  <Input
                    id="daily_checkin_base_credit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rewardSettings.daily_checkin_base_credit}
                    onChange={(e) => updateReward("daily_checkin_base_credit", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Credits awarded for each daily check-in
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_daily_reward_cap">Daily Reward Cap (0 = unlimited)</Label>
                  <Input
                    id="max_daily_reward_cap"
                    type="number"
                    min="0"
                    value={rewardSettings.max_daily_reward_cap}
                    onChange={(e) => updateReward("max_daily_reward_cap", parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum credits per day (including streak bonuses)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <Label htmlFor="streak_enabled" className="font-medium">
                      Enable Streak Bonuses
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reward users for consecutive daily check-ins
                  </p>
                </div>
                <Switch
                  id="streak_enabled"
                  checked={rewardSettings.streak_enabled}
                  onCheckedChange={(checked) => updateReward("streak_enabled", checked)}
                />
              </div>

              {rewardSettings.streak_enabled && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Streak Configuration</h4>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="streak_bonus_credit">Bonus per Streak Day (credits)</Label>
                      <Input
                        id="streak_bonus_credit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={rewardSettings.streak_bonus_credit}
                        onChange={(e) => updateReward("streak_bonus_credit", parseFloat(e.target.value) || 0)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Additional credits per day of streak
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Streak Milestones</Label>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Day 3:</span>
                          <span className="font-mono">+{rewardSettings.streak_milestone_3} credits</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Day 7:</span>
                          <span className="font-mono">+{rewardSettings.streak_milestone_7} credits</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Day 14:</span>
                          <span className="font-mono">+{rewardSettings.streak_milestone_14} credits</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Day 30:</span>
                          <span className="font-mono">+{rewardSettings.streak_milestone_30} credits</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="streak_milestone_3">Day 3 Bonus</Label>
                      <Input
                        id="streak_milestone_3"
                        type="number"
                        min="0"
                        value={rewardSettings.streak_milestone_3}
                        onChange={(e) => updateReward("streak_milestone_3", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="streak_milestone_7">Day 7 Bonus</Label>
                      <Input
                        id="streak_milestone_7"
                        type="number"
                        min="0"
                        value={rewardSettings.streak_milestone_7}
                        onChange={(e) => updateReward("streak_milestone_7", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="streak_milestone_14">Day 14 Bonus</Label>
                      <Input
                        id="streak_milestone_14"
                        type="number"
                        min="0"
                        value={rewardSettings.streak_milestone_14}
                        onChange={(e) => updateReward("streak_milestone_14", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="streak_milestone_30">Day 30 Bonus</Label>
                      <Input
                        id="streak_milestone_30"
                        type="number"
                        min="0"
                        value={rewardSettings.streak_milestone_30}
                        onChange={(e) => updateReward("streak_milestone_30", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="translation" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Translation Pricing</CardTitle>
                  <CardDescription>
                    Configure how credits are charged for Minecraft plugin translations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset("translation")}
                    disabled={isSubmitting}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave("translation")}
                    disabled={isSubmitting || !hasChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="translation_credits_per_line">Credits per Line</Label>
                  <Input
                    id="translation_credits_per_line"
                    type="number"
                    step="0.01"
                    min="0"
                    value={translationSettings.translation_credits_per_line}
                    onChange={(e) => updateTranslation("translation_credits_per_line", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cost per line of translation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="translation_min_charge">Minimum Charge</Label>
                  <Input
                    id="translation_min_charge"
                    type="number"
                    step="0.01"
                    min="0"
                    value={translationSettings.translation_min_charge}
                    onChange={(e) => updateTranslation("translation_min_charge", parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum credits charged for any translation job
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="translation_max_free_lines">Free Lines</Label>
                  <Input
                    id="translation_max_free_lines"
                    type="number"
                    min="0"
                    value={translationSettings.translation_max_free_lines}
                    onChange={(e) => updateTranslation("translation_max_free_lines", parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of lines translated for free before charging
                  </p>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Pricing Preview</h4>
                <p className="text-sm text-muted-foreground">
                  For a 100-line file: {Math.max(
                    translationSettings.translation_min_charge,
                    (Math.max(0, 100 - translationSettings.translation_max_free_lines) * translationSettings.translation_credits_per_line)
                  ).toFixed(2)} credits
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economy" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Download Economy</CardTitle>
                  <CardDescription>
                    Configure credit-based downloads and pricing
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReset("economy")}
                    disabled={isSubmitting}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave("economy")}
                    disabled={isSubmitting || !hasChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <Label htmlFor="download_credit_enabled" className="font-medium">
                      Enable Credit-based Downloads
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow creators to charge credits for downloads
                  </p>
                </div>
                <Switch
                  id="download_credit_enabled"
                  checked={economySettings.download_credit_enabled}
                  onCheckedChange={(checked) => updateEconomy("download_credit_enabled", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="download_default_credit_cost">Default Credit Cost</Label>
                <Input
                  id="download_default_credit_cost"
                  type="number"
                  min="0"
                  value={economySettings.download_default_credit_cost}
                  onChange={(e) => updateEconomy("download_default_credit_cost", parseInt(e.target.value) || 0)}
                  disabled={!economySettings.download_credit_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Default credit cost for new listings (creators can override)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
