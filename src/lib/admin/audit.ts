import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

// Separate function to safely get supabase client that works in both server and client components
async function getSupabaseClient() {
  try {
    return await createClient();
  } catch (error) {
    // If there's an error (like in client components with next/headers), 
    // we'll still try to create a client - the createClient function now handles this
    return await createClient();
  }
}

export type AuditActionType = Database["public"]["Tables"]["admin_audit_logs"]["Row"]["action_type"];
export type AuditTargetType = Database["public"]["Tables"]["admin_audit_logs"]["Row"]["target_type"];

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  action_type: AuditActionType;
  target_type: AuditTargetType;
  target_id: string | null;
  target_name: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateAuditLogParams {
  adminId: string;
  actionType: AuditActionType;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const supabase = await getSupabaseClient();
  
  const { error } = await supabase
    .from("admin_audit_logs")
    .insert({
      admin_user_id: params.adminId,
      action_type: params.actionType,
      target_type: params.targetType,
      target_id: params.targetId,
      target_name: params.targetName,
      note: params.note,
      metadata: params.metadata as Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["metadata"]
    });
  
  if (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(options: {
  adminId?: string;
  actionType?: AuditActionType;
  targetType?: AuditTargetType;
  targetId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const supabase = await getSupabaseClient();
  
  let query = supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  
  if (options.adminId) {
    query = query.eq("admin_user_id", options.adminId);
  }
  if (options.actionType) {
    query = query.eq("action_type", options.actionType);
  }
  if (options.targetType) {
    query = query.eq("target_type", options.targetType);
  }
  if (options.targetId) {
    query = query.eq("target_id", options.targetId);
  }
  
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  const { data, error, count } = await query.range(offset, offset + limit - 1);
  
  if (error) {
    console.error("Failed to fetch audit logs:", error);
    return { logs: [], total: 0 };
  }
  
  return {
    logs: data as AuditLogEntry[],
    total: count || 0
  };
}

export async function getRecentAuditLogs(limit: number = 20): Promise<AuditLogEntry[]> {
  const result = await getAuditLogs({ limit });
  return result.logs;
}

export async function getAuditLogsForUser(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const result = await getAuditLogs({ targetType: "user", targetId: userId, limit });
  return result.logs;
}

export async function getAuditLogsForListing(listingId: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const result = await getAuditLogs({ targetType: "listing", targetId: listingId, limit });
  return result.logs;
}

export const ACTION_LABELS: Record<AuditActionType, string> = {
  credit_adjust: "Credit Adjustment",
  refund: "Refund",
  user_ban: "User Ban",
  user_unban: "User Unban",
  user_suspend: "User Suspension",
  user_unsuspend: "User Unsuspension",
  role_change: "Role Change",
  listing_hide: "Listing Hidden",
  listing_unhide: "Listing Unhidden",
  listing_delete: "Listing Deleted",
  listing_restore: "Listing Restored",
  settings_change: "Settings Change",
  report_dismiss: "Report Dismissed",
  report_action: "Report Action Taken"
};
