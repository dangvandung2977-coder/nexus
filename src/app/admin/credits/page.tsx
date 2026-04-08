import { listWallets, getPlatformCreditStats } from "@/actions/admin/credits";
import { AdminCreditsClient } from "@/components/admin/AdminCreditsClient";

export default async function AdminCreditsPage() {
  const [{ wallets, total, error }, stats] = await Promise.all([
    listWallets({ page: 1, limit: 20 }),
    getPlatformCreditStats(),
  ]);

  return (
    <AdminCreditsClient
      initialWallets={wallets}
      initialTotal={total}
      initialStats={stats}
      error={error}
    />
  );
}
