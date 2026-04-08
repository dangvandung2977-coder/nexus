"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateSlug } from "@/lib/utils";
import type { CreateListingInput, UpdateListingInput } from "@/lib/validations/listing";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function createListing(input: CreateListingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { tags, changelog, ...listingData } = input;
  const slug = generateSlug(input.title);

  const { data, error } = await supabase
    .from("listings")
    // @ts-ignore
    .insert({
      ...listingData,
      slug,
      creator_id: user.id,
      external_url: input.external_url || null,
      youtube_url: input.youtube_url || null,
    })
    .select()
    .single();
  const listing = data as any;

  if (error) return { error: error.message };

  // Insert initial version if changelog provided
  if (changelog) {
    // @ts-ignore
    await supabase.from("listing_versions").insert({
      listing_id: listing.id,
      version_number: "1.0.0",
      changelog: changelog,
    });
  }

  // Insert tags
  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
      const { data } = await supabase
        .from("tags")
        // @ts-ignore
        .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
        .select()
        .single();
      const tag = data as any;
      if (tag) {
        // @ts-ignore
        await supabase.from("listing_tags").insert({
          listing_id: listing.id,
          tag_id: tag.id,
        });
      }
    }
  }

  revalidatePath("/dashboard/listings");
  revalidatePath("/explore");
  return { data: listing };
}

export async function updateListing(id: string, input: UpdateListingInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Ownership check
  const { data: existing } = await supabase
    .from("listings")
    .select("creator_id")
    .eq("id", id)
    .single();
  if (!existing || (existing as any).creator_id !== user.id) return { error: "Forbidden" };

  const { tags, changelog, ...listingData } = input;

  const { data, error } = await supabase
    .from("listings")
    // @ts-ignore
    .update({ 
      ...listingData, 
      external_url: input.external_url || null,
      youtube_url: input.youtube_url || null,
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  const listing = data as any;

  // Replace tags
  if (tags !== undefined) {
    await supabase.from("listing_tags").delete().eq("listing_id", id);
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
      const { data } = await supabase
        .from("tags")
        // @ts-ignore
        .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
        .select()
        .single();
      const tag = data as any;
      if (tag) {
        // @ts-ignore
        await supabase.from("listing_tags").insert({ listing_id: id, tag_id: tag.id });
      }
    }
  }

  revalidatePath(`/listing/${listing.slug}`);
  revalidatePath("/dashboard/listings");
  return { data: listing };
}

export async function deleteListing(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("listings")
    .select("creator_id")
    .eq("id", id)
    .single();
  if (!existing || (existing as any).creator_id !== user.id) return { error: "Forbidden" };

  const { error } = await supabase
    .from("listings")
    // @ts-ignore
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/listings");
  return { success: true };
}

export async function getListings({
  page = 1,
  category,
  search,
  sort = "newest",
  platform,
  tag,
}: {
  page?: number;
  category?: string;
  search?: string;
  sort?: string;
  platform?: string;
  tag?: string;
} = {}) {
  const supabase = await createClient();
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  try {
    let query = supabase
      .from("listings")
      .select(
        category 
          ? `*, profiles!creator_id(id,username,display_name,avatar_url,verified), categories!inner(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order), listing_tags(tags(id,name,slug))`
          : `*, profiles!creator_id(id,username,display_name,avatar_url,verified), categories(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order), listing_tags(tags(id,name,slug))`,
        { count: "exact" }
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .range(from, to);

    if (category) query = query.eq("categories.slug", category);
    if (search) query = query.ilike("title", `%${search}%`);
    if (platform) query = query.contains("platforms", [platform]);

    switch (sort) {
      case "trending": query = query.order("popularity_score", { ascending: false }); break;
      case "most_downloaded": query = query.order("download_count", { ascending: false }); break;
      case "oldest": query = query.order("created_at", { ascending: true }); break;
      default: query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("Supabase Error [getListings]:", error);
      return { data: [], count: 0, error: error.message };
    }
    return { data: data ?? [], count: count ?? 0 };
  } catch (err: any) {
    console.error("Runtime Error [getListings]:", err);
    return { data: [], count: 0, error: err.message || "Unknown error occurred" };
  }
}

export async function getListing(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`*, profiles!creator_id(id,username,display_name,avatar_url,verified), categories(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order), listing_tags(tags(id,name,slug)), listing_versions(id,version_number,changelog,created_at), listing_files(id,file_name,file_size,file_type,download_count)`)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error) return null;

  // Increment view count (fire and forget)
  // @ts-ignore
  supabase.rpc("increment_view_count", { listing_id: (data as any).id }).then(() => {});

  return data as any;
}

export async function getMyListings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("listings")
    .select(`*, categories(id,name,slug), listing_images(image_path,sort_order)`)
    .eq("creator_id", user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  return data ?? [];
}

export async function getMyListingById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("listings")
    .select(
      `*, profiles!creator_id(id,username,display_name,avatar_url,verified,bio), categories(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order), listing_tags(tags(id,name,slug)), listing_versions(id,version_number,changelog,created_at), listing_files(id,file_name,file_size,file_type,download_count,created_at)`
    )
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  return data as any;
}

export async function getFeaturedListings(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`*, profiles!creator_id(id,username,display_name,avatar_url,verified), categories(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order)`)
    .eq("status", "published")
    .eq("featured", true)
    .is("deleted_at", null)
    .order("popularity_score", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTrendingListings(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`*, profiles!creator_id(id,username,display_name,avatar_url,verified), categories(id,name,slug,color,icon), listing_images(id,image_path,alt_text,sort_order)`)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("popularity_score", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getCreatorListings(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`*, categories(id,name,slug,color,icon), listing_images(image_path,sort_order)`)
    .eq("creator_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function togglePublish(id: string, currentStatus: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const newStatus = currentStatus === "published" ? "draft" : "published";
  const { error } = await supabase
    .from("listings")
    // @ts-ignore
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/listings");
  return { status: newStatus };
}
