import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";

export type UserRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];
export type UserStatus = Database["public"]["Tables"]["profiles"]["Row"]["status"];

export interface AdminUser {
  id: string;
  role: UserRole;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AdminCheckResult {
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  user: AdminUser | null;
  error?: string;
}

export async function checkAdminAccess(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isAdmin: false,
      isModerator: false,
      isStaff: false,
      user: null,
      error: "Not authenticated"
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      isAdmin: false,
      isModerator: false,
      isStaff: false,
      user: null,
      error: "Profile not found"
    };
  }

  const isAdmin = profile.role === "admin";
  const isModerator = profile.role === "moderator" || isAdmin;
  const isStaff = isModerator;

  if (!isStaff) {
    return {
      isAdmin,
      isModerator,
      isStaff,
      user: null,
      error: "Insufficient permissions"
    };
  }

  return {
    isAdmin,
    isModerator,
    isStaff,
    user: profile as AdminUser
  };
}

export async function requireAdmin(): Promise<AdminUser> {
  const result = await checkAdminAccess();
  
  if (!result.user || !result.isStaff) {
    throw new Error(result.error || "Admin access required");
  }
  
  return result.user;
}

export async function getAdminProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  return profile;
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

export function canModerate(role: UserRole): boolean {
  return role === "admin" || role === "moderator";
}

export function canAdjustCredits(role: UserRole): boolean {
  return role === "admin";
}

export function canChangeSettings(role: UserRole): boolean {
  return role === "admin";
}
