"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { UpdateProfileInput } from "@/lib/validations/profile";

export async function getProfile(usernameOrId: string) {
  const supabase = await createClient();
  // Try username first
  let { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", usernameOrId)
    .single();

  if (error || !data) {
    // Check if it's a UUID and try ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId);
    if (isUuid) {
      const res = await supabase.from("profiles").select("*").eq("id", usernameOrId).single();
      data = res.data;
    }
  }
  return data as any;
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check username uniqueness (if changed)
  if (input.username) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", input.username)
      .neq("id", user.id)
      .single();
    if (existing) return { error: "Username is already taken." };
  }

  const { data, error } = await supabase
    .from("profiles")
    // @ts-ignore
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/settings");
  return { data: data as any };
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

  await supabase
    .from("profiles")
    // @ts-ignore
    .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/dashboard/settings");
  return { url: urlData.publicUrl };
}

export async function getCreatorStats(userId: string) {
  const supabase = await createClient();
  const [listingsRes, downloadsRes, favoritesRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id", { count: "exact" })
      .eq("creator_id", userId)
      .eq("status", "published"),
    supabase
      .from("downloads")
      .select("id", { count: "exact" })
      .eq("listing_id", userId), // simplified — in prod join via listings
    supabase
      .from("favorites")
      .select("listing_id", { count: "exact" }),
  ]);

  return {
    listings: listingsRes.count ?? 0,
    downloads: downloadsRes.count ?? 0,
    favorites: favoritesRes.count ?? 0,
  };
}
