"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess, canModerate } from "@/lib/admin/auth";
import { createAuditLog, getAuditLogs, type AuditLogEntry } from "@/lib/admin/audit";
import { Database } from "@/types/database.types";

export type ListingStatus = Database["public"]["Tables"]["listings"]["Row"]["status"];
export type ModerationStatus = Database["public"]["Tables"]["listings"]["Row"]["moderation_status"];

export interface AdminListing {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  short_description: string;
  status: ListingStatus;
  moderation_status: ModerationStatus;
  moderation_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  view_count: number;
  download_count: number;
  favorite_count: number;
  featured: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  creator: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  category?: {
    name: string;
    slug: string;
  };
}

export interface ListListingsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ListingStatus;
  moderationStatus?: ModerationStatus;
  creatorId?: string;
  featured?: boolean;
  sortBy?: "created_at" | "title" | "view_count" | "download_count";
  sortOrder?: "asc" | "desc";
}

export async function listListings(params: ListListingsParams = {}) {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { error: "Unauthorized", listings: [], total: 0 };
  }

  const supabase = await createClient();
  const { page = 1, limit = 20, search, status, moderationStatus, creatorId, featured, sortBy = "created_at", sortOrder = "desc" } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("listings")
    .select(`
      *,
      creator:profiles!creator_id (
        username,
        display_name,
        avatar_url
      ),
      category:categories (
        name,
        slug
      )
    `, { count: "exact" });

  if (search) {
    query = query.or(`title.ilike.%${search}%,short_description.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (moderationStatus) {
    query = query.eq("moderation_status", moderationStatus);
  }
  if (creatorId) {
    query = query.eq("creator_id", creatorId);
  }
  if (featured !== undefined) {
    query = query.eq("featured", featured);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { error: error.message, listings: [], total: 0 };
  }

  return { listings: data as AdminListing[], total: count || 0 };
}

export async function getListing(listingId: string): Promise<{
  listing: AdminListing | null;
  error?: string;
}> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { listing: null, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      creator:profiles!creator_id (
        id,
        username,
        display_name,
        avatar_url,
        status,
        role
      ),
      category:categories (
        name,
        slug
      )
    `)
    .eq("id", listingId)
    .single();

  if (error || !data) {
    return { listing: null, error: "Listing not found" };
  }

  return { listing: data as AdminListing };
}

export async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canModerate(admin.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog({
    adminId: admin.user.id,
    actionType: status === "archived" ? "listing_delete" : "listing_restore",
    targetType: "listing",
    targetId: listingId,
    note: reason || `Status changed to ${status}`
  });

  revalidatePath("/admin/resources");
  revalidatePath(`/admin/resources/${listingId}`);
  return { success: true };
}

export async function updateModerationStatus(
  listingId: string,
  moderationStatus: ModerationStatus,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canModerate(admin.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({
      moderation_status: moderationStatus,
      moderation_reason: reason,
      moderated_by: admin.user.id,
      moderated_at: new Date().toISOString()
    })
    .eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  const actionType = moderationStatus === "hidden" ? "listing_hide"
    : moderationStatus === "removed" ? "listing_delete"
    : moderationStatus === "approved" ? "listing_unhide" : "report_action";

  await createAuditLog({
    adminId: admin.user.id,
    actionType,
    targetType: "listing",
    targetId: listingId,
    note: reason || `Moderation status changed to ${moderationStatus}`
  });

  revalidatePath("/admin/resources");
  revalidatePath(`/admin/resources/${listingId}`);
  return { success: true };
}

export async function softDeleteListing(
  listingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !canModerate(admin.user.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({
      deleted_at: new Date().toISOString(),
      status: "archived",
      moderation_status: "removed",
      moderation_reason: reason,
      moderated_by: admin.user.id,
      moderated_at: new Date().toISOString()
    })
    .eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog({
    adminId: admin.user.id,
    actionType: "listing_delete",
    targetType: "listing",
    targetId: listingId,
    note: reason || "Listing deleted by admin"
  });

  revalidatePath("/admin/resources");
  revalidatePath("/admin");
  return { success: true };
}

export async function restoreListing(
  listingId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { success: false, error: "Insufficient permissions" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("listings")
    .update({
      deleted_at: null,
      status: "draft",
      moderation_status: "approved",
      moderation_reason: null,
      moderated_by: null,
      moderated_at: null
    })
    .eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  await createAuditLog({
    adminId: admin.user.id,
    actionType: "listing_restore",
    targetType: "listing",
    targetId: listingId,
    note: reason || "Listing restored by admin"
  });

  revalidatePath("/admin/resources");
  return { success: true };
}

export async function toggleFeatured(
  listingId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isAdmin) {
    return { success: false, error: "Only admins can toggle featured status" };
  }

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("listings")
    .select("featured")
    .eq("id", listingId)
    .single();

  if (!current) {
    return { success: false, error: "Listing not found" };
  }

  const { error } = await supabase
    .from("listings")
    .update({ featured: !current.featured })
    .eq("id", listingId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/resources");
  return { success: true };
}

export async function getListingStats(): Promise<{
  total: number;
  published: number;
  drafts: number;
  flagged: number;
  hidden: number;
  deleted: number;
  featured: number;
} | null> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("status, moderation_status, featured, deleted_at");

  if (error) return null;

  return {
    total: data.length,
    published: data.filter(l => l.status === "published" && !l.deleted_at).length,
    drafts: data.filter(l => l.status === "draft" && !l.deleted_at).length,
    flagged: data.filter(l => l.status === "flagged" && !l.deleted_at).length,
    hidden: data.filter(l => l.moderation_status === "hidden" && !l.deleted_at).length,
    deleted: data.filter(l => l.deleted_at).length,
    featured: data.filter(l => l.featured && !l.deleted_at).length
  };
}

export async function getUserListings(
  userId: string,
  options: { page?: number; limit?: number; includeDeleted?: boolean } = {}
): Promise<{ listings: AdminListing[]; total: number }> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return { listings: [], total: 0 };
  }

  const supabase = await createClient();
  const { page = 1, limit = 20, includeDeleted = false } = options;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("listings")
    .select(`
      *,
      category:categories (
        name,
        slug
      )
    `, { count: "exact" })
    .eq("creator_id", userId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return { listings: [], total: 0 };
  }

  return { listings: data as AdminListing[], total: count || 0 };
}

export async function getAuditLogsForListing(
  listingId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return [];
  }

  const result = await getAuditLogs({ targetType: "listing", targetId: listingId, limit });
  return result.logs;
}