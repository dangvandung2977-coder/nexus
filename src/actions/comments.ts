"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CreateCommentInput } from "@/lib/validations/comment";

export async function getComments(listingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(`*, profiles(id,username,display_name,avatar_url)`)
    .eq("listing_id", listingId)
    .is("parent_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!data) return [];

  // Fetch replies for each comment
  const withReplies = await Promise.all(
    (data as any[]).map(async (comment) => {
      const { data: replies } = await supabase
        .from("comments")
        .select(`*, profiles(id,username,display_name,avatar_url)`)
        .eq("listing_id", listingId)
        .eq("parent_id", comment.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      return { ...comment, replies: replies ?? [] };
    })
  );

  return withReplies;
}

export async function createComment(listingId: string, input: CreateCommentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to comment.", data: null };

  const { data, error } = await supabase
    .from("comments")
    // @ts-ignore
    .insert({
      listing_id: listingId,
      author_id: user.id,
      body: input.body,
      parent_id: input.parent_id ?? null,
    })
    .select(`*, profiles(id,username,display_name,avatar_url)`)
    .single();

  if (error) return { error: error.message, data: null };
  revalidatePath(`/listing`);
  return { data, error: null };
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", success: false };

  const { error } = await supabase
    .from("comments")
    // @ts-ignore
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) return { error: error.message, success: false };
  revalidatePath(`/listing`);
  return { success: true, error: null };
}

export async function toggleFavorite(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to favorite." };

  const { data: existing } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .single();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    return { favorited: false };
  } else {
    // @ts-ignore
    await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
    return { favorited: true };
  }
}

export async function isFavorited(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .single();

  return !!data;
}

export async function createReview(
  listingId: string,
  rating: number,
  body: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", data: null };

  const { data, error } = await supabase
    .from("reviews")
    // @ts-ignore
    .upsert(
      { listing_id: listingId, author_id: user.id, rating, body },
      { onConflict: "listing_id,author_id" }
    )
    .select(`*, profiles(id,username,display_name,avatar_url)`)
    .single();

  if (error) return { error: error.message, data: null };
  revalidatePath(`/listing`);
  return { data, error: null };
}

export async function getReviews(listingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(`*, profiles(id,username,display_name,avatar_url)`)
    .eq("listing_id", listingId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}
