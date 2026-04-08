import { listUsers } from "@/actions/admin/users";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = parseInt(String(params.page || "1"));
  const search = String(params.search || "");
  const role = params.role as string | undefined;
  const status = params.status as string | undefined;

  const { users, total, error } = await listUsers({
    page,
    limit: 20,
    search,
    role: role as "user" | "creator" | "moderator" | "admin" | undefined,
    status: status as "active" | "suspended" | "banned" | undefined,
  });

  return (
    <AdminUsersClient
      initialUsers={users}
      initialTotal={total}
      initialPage={page}
      initialSearch={search}
      initialRole={role}
      initialStatus={status}
      error={error}
    />
  );
}
