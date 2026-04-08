"use server";

import { createClient } from "@/lib/supabase/server";
import { checkAdminAccess } from "@/lib/admin/auth";
import { getRecentAuditLogs, type AuditLogEntry } from "@/lib/admin/audit";

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    banned: number;
    suspended: number;
  };
  listings: {
    total: number;
    published: number;
    drafts: number;
    flagged: number;
    hidden: number;
  };
  credits: {
    totalInCirculation: number;
    totalTransactions: number;
  };
  activity: {
    todayCheckins: number;
    todayDownloads: number;
    pendingReports: number;
  };
}

export interface RecentActivity {
  auditLogs: AuditLogEntry[];
  newUsers: { id: string; username: string; created_at: string }[];
  recentListings: { id: string; title: string; creator: { username: string }; created_at: string }[];
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return null;
  }

  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("status, role");

  const { data: listings } = await supabase
    .from("listings")
    .select("status, moderation_status, deleted_at");

  const { data: wallets } = await supabase
    .from("credit_wallets")
    .select("balance");

  const profileData = profiles as any[];
  const listingData = listings as any[];
  const walletData = wallets as any[];

  return {
    users: {
      total: profileData?.length || 0,
      active: profileData?.filter(p => p.status === "active").length || 0,
      banned: profileData?.filter(p => p.status === "banned").length || 0,
      suspended: profileData?.filter(p => p.status === "suspended").length || 0
    },
    listings: {
      total: listingData?.filter(l => !l.deleted_at).length || 0,
      published: listingData?.filter(l => l.status === "published" && !l.deleted_at).length || 0,
      drafts: listingData?.filter(l => l.status === "draft" && !l.deleted_at).length || 0,
      flagged: listingData?.filter(l => l.status === "flagged" && !l.deleted_at).length || 0,
      hidden: listingData?.filter(l => l.moderation_status === "hidden" && !l.deleted_at).length || 0
    },
    credits: {
      totalInCirculation: walletData?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0,
      totalTransactions: totalTransactions || 0
    },
    activity: {
      todayCheckins: todayCheckins || 0,
      todayDownloads: todayDownloads || 0,
      pendingReports: pendingReports || 0
    }
  };
}

export async function getRecentActivity(): Promise<RecentActivity | null> {
  const admin = await checkAdminAccess();
  if (!admin.user || !admin.isStaff) {
    return null;
  }

  const supabase = await createClient();

  const [auditLogs, newUsers, recentListings] = await Promise.all([
    getRecentAuditLogs(10),
    supabase
      .from("profiles")
      .select("id, username, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("listings")
      .select("id, title, created_at, creator:profiles!creator_id(username)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return {
    auditLogs,
    newUsers: (newUsers.data || []) as { id: string; username: string; created_at: string }[],
    recentListings: (recentListings.data || []) as { id: string; title: string; creator: { username: string }; created_at: string }[]
  };
}
