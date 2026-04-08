import { getAdminSettings, getRewardSettings, getTranslationSettingsAdmin, getEconomySettingsAdmin } from "@/actions/admin/settings";
import { AdminSettingsClient } from "@/components/admin/AdminSettingsClient";

export default async function AdminSettingsPage() {
  const [{ settings, error: settingsError }, rewardResult, translationResult, economyResult] = await Promise.all([
    getAdminSettings(),
    getRewardSettings(),
    getTranslationSettingsAdmin(),
    getEconomySettingsAdmin(),
  ]);

  return (
    <AdminSettingsClient
      initialSettings={settings.settings}
      initialRewardSettings={rewardResult.settings}
      initialTranslationSettings={translationResult.settings}
      initialEconomySettings={economyResult.settings}
      error={settingsError}
    />
  );
}
