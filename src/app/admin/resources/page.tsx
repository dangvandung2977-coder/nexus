import { listListings } from "@/actions/admin/listings";
import { AdminResourcesClient } from "@/components/admin/AdminResourcesClient";

export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = parseInt(String(params.page || "1"));
  const search = String(params.search || "");
  const status = params.status as string | undefined;
  const moderationStatus = params.moderation as string | undefined;

  const { listings, total, error } = await listListings({
    page,
    limit: 20,
    search,
    status: status as "draft" | "published" | "archived" | "flagged" | undefined,
    moderationStatus: moderationStatus as "approved" | "pending_review" | "hidden" | "removed" | undefined,
  });

  return (
    <AdminResourcesClient
      initialListings={listings}
      initialTotal={total}
      initialPage={page}
      initialSearch={search}
      initialStatus={status}
      initialModeration={moderationStatus}
      error={error}
    />
  );
}
