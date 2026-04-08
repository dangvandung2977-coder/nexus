import { notFound } from "next/navigation";
import { getUser } from "@/actions/admin/users";
import { getTransactionHistory } from "@/actions/admin/credits";
import { getUserListings } from "@/actions/admin/listings";
import { getAuditLogsForUser } from "@/lib/admin/audit";
import { AdminUserDetailClient } from "@/components/admin/AdminUserDetailClient";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const initialAction = query.action as string | undefined;

  const [{ user, error }, transactionsResult, listingsResult, auditLogs] = await Promise.all([
    getUser(id),
    getTransactionHistory(id, { limit: 10 }),
    getUserListings(id, { limit: 5 }),
    getAuditLogsForUser(id, 20),
  ]);

  if (error || !user) {
    notFound();
  }

  return (
    <AdminUserDetailClient
      user={user}
      initialTransactions={transactionsResult.transactions}
      initialListings={listingsResult.listings}
      auditLogs={auditLogs}
      initialAction={initialAction}
    />
  );
}
