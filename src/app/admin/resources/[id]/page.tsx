import { notFound } from "next/navigation";
import { getListing, getAuditLogsForListing } from "@/actions/admin/listings";
import { AdminResourceDetailClient } from "@/components/admin/AdminResourceDetailClient";

export default async function AdminResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ listing, error }, auditLogs] = await Promise.all([
    getListing(id),
    getAuditLogsForListing(id, 20),
  ]);

  if (error || !listing) {
    notFound();
  }

  return (
    <AdminResourceDetailClient
      listing={listing}
      auditLogs={auditLogs}
    />
  );
}
