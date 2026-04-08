"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess, canManageUsers } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];
export type UserStatus = Database["public"]["Tables"]["profiles"]["Row"]["status"];

export interface AdminUserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  ban_reason: string | null;
  ban_expires_at: string | null;
  banned_at: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
  credit_balance?: number;
  listings_count?: number;
  downloads_count?: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: "created_at" | "username" | "role";
  sortOrder?: "asc" | "desc";
}

export async function listUsers(params: ListUsersParams = {}) {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { error: "Unauthorized", users: [], total: 0 };
  }

  const supabase = await createClient();
  const { page = 1, limit = 20, search, role, status, sortBy = "created_at", sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("*, credit_wallets(balance)", { count: "exact" });

  if (search) {
    query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (status) {
    query = query.eq("status", status);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { error: error.message, users: [], total: 0 };
  }

  const users: AdminUserProfile[] = (data || []).map((profile) => ({
    ...profile,
    credit_balance: (profile as unknown as { credit_wallets: { balance: number }[] }).credit_wallets?.[0]?.balance
  }));

  return { users, total: count || 0 };
}

export async function getUser(userId: string): Promise<{ user: AdminUserProfile | null; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { user: null, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { user: null, error: "User not found" };
  }

  const { data: wallet } = await supabase
    .from("credit_wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const { count: listingsCount } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", userId);

  const { count: downloadsCount } = await supabase
    .from("downloads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    user: {
      ...profile,
      credit_balance: wallet?.balance ?? 0,
      listings_count: listingsCount ?? 0,
      downloads_count: downloadsCount ?? 0
    } as AdminUserProfile
  };
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isAdmin) {
    return { success: false, error: "Only admins can change roles" };
  }

  if (userId === admin.user.id) {
    return { success: false, error: "Cannot change your own role" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog({
    adminId: admin.user.id,
    actionType: "role_change",
    targetType: "user",
    targetId: userId,
    note: note || `Role changed to ${newRole}`,
    metadata: { newRole }
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUserStatus(
  userId: string,
  newStatus: UserStatus,
  options: {
    reason?: string;
    expiresAt?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { success: false, error: "Unauthorized" };
  }

  if (userId === admin.user.id) {
    return { success: false, error: "Cannot ban/suspend yourself" };
  }

  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status: newStatus,
    banned_by: admin.user.id,
    banned_at: new Date().toISOString()
  };

  if (options.reason) {
    updateData.ban_reason = options.reason;
  }

  if (options.expiresAt) {
    updateData.ban_expires_at = options.expiresAt;
  } else if (newStatus === "active") {
    updateData.ban_reason = null;
    updateData.ban_expires_at = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  const actionType = newStatus === "banned" ? "user_ban"
    : newStatus === "suspended" ? "user_suspend"
    : newStatus === "active" ? "user_unban" : "user_unsuspend";

  await createAuditLog({
    adminId: admin.user.id,
    actionType,
    targetType: "user",
    targetId: userId,
    note: options.reason || `Status changed to ${newStatus}`,
    metadata: {
      reason: options.reason,
      expiresAt: options.expiresAt
    }
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function getUserStats(): Promise<{
  total: number;
  active: number;
  banned: number;
  suspended: number;
  admins: number;
  moderators: number;
  creators: number;
} | null> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("status, role");

  if (error) return null;

  return {
    total: data.length,
    active: data.filter(p => p.status === "active").length,
    banned: data.filter(p => p.status === "banned").length,
    suspended: data.filter(p => p.status === "suspended").length,
    admins: data.filter(p => p.role === "admin").length,
    moderators: data.filter(p => p.role === "moderator").length,
    creators: data.filter(p => p.role === "creator").length
  };
}
