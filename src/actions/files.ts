"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { adjustCredits, getWallet } from "./wallet";

export async function uploadListingCover(listingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Invalid image type" };
  if (file.size > MAX_IMAGE_SIZE) return { error: "Image must be under 5MB" };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${listingId}/cover.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.COVERS)
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.COVERS)
    .getPublicUrl(path);

  await supabase
    .from("listings")
    // @ts-ignore
    .update({ cover_image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("creator_id", user.id);

  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { url: urlData.publicUrl };
}

export async function uploadListingScreenshot(listingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { error: "Invalid image type" };
  if (file.size > MAX_IMAGE_SIZE) return { error: "Image must be under 5MB" };

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}.${ext}`;
  const path = `${user.id}/${listingId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.SCREENSHOTS)
    .upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKETS.SCREENSHOTS)
    .getPublicUrl(path);

  // Get current max sort_order
  const { data: images } = await supabase
    .from("listing_images")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = images && images.length > 0 ? (images as any[])[0].sort_order + 1 : 0;

  const { data: image, error } = await supabase
    .from("listing_images")
    // @ts-ignore
    .insert({ listing_id: listingId, image_path: urlData.publicUrl, sort_order: sortOrder })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: image };
}

export async function deleteListingScreenshot(imageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data } = await supabase
    .from("listing_images")
    .select("*, listings(creator_id)")
    .eq("id", imageId)
    .single();
  const image = data as any;

  if (!image) return { error: "Image not found" };
  if (image.listings?.creator_id !== user.id) return { error: "Forbidden" };

  const { error } = await supabase
    .from("listing_images")
    .delete()
    .eq("id", imageId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function uploadListingFile(listingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };
  if (file.size > MAX_FILE_SIZE) return { error: "File must be under 50MB" };

  const ext = file.name.split(".").pop();
  const sanitzedName = file.name.replace(/\s+/g, "_");
  const fileName = `${Date.now()}_${sanitzedName}`;
  const path = `${user.id}/${listingId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.FILES)
    .upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { data: fileRecord, error } = await supabase
    .from("listing_files")
    // @ts-ignore
    .insert({
      listing_id: listingId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/listings/${listingId}/edit`);
  return { data: fileRecord };
}

export async function getDownloadUrl(fileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch file with listing info (including credit_cost)
  const { data } = await supabase
    .from("listing_files")
    .select("*, listings(id, title, status, creator_id, credit_cost)")
    .eq("id", fileId)
    .single();
  const fileRecord = data as any;

  if (!fileRecord) return { error: "File not found" };
  if (fileRecord.listings?.status !== "published") return { error: "Listing not available" };

  const listing = fileRecord.listings;
  const creditCost = Number(listing?.credit_cost ?? 0);

  // Handle paid downloads (credit_cost > 0)
  if (creditCost > 0) {
    // User must be authenticated for paid downloads
    if (!user) {
      return { error: "Please sign in to download this resource", requiresAuth: true };
    }

    // Check wallet balance
    const { wallet, error: walletError } = await getWallet();
    if (walletError) return { error: walletError };
    
    if (!wallet || Number(wallet.balance) < creditCost) {
      return { 
        error: "Insufficient credits", 
        insufficientBalance: true,
        required: creditCost,
        current: wallet ? Number(wallet.balance) : 0
      };
    }

    // Deduct credits using the safe RPC (prevents race conditions)
    const { error: deductError } = await adjustCredits(
      user.id,
      -creditCost,
      "download_cost",
      `Download: ${listing.title}`,
      "listing",
      listing.id
    );

    if (deductError) {
      return { error: deductError };
    }

    // NEW: Payout to creator
    if (listing.creator_id) {
       await adjustCredits(
        listing.creator_id,
        creditCost,
        "listing_payout" as any, // Bypass TS check for new type until regenerated
        `Earnings from download: ${listing.title}`,
        "listing",
        listing.id
      );
    }
  }

  // Create a signed URL (expires in 60s)
  const { data: signedUrl, error } = await supabase.storage
    .from(STORAGE_BUCKETS.FILES)
    .createSignedUrl(fileRecord.file_path, 60, {
      download: fileRecord.file_name
    });

  if (error) return { error: error.message };

  // Track download with credit_cost
  // @ts-ignore
  await supabase.from("downloads").insert({
    listing_id: fileRecord.listing_id,
    file_id: fileId,
    user_id: user?.id ?? null,
    credit_cost: creditCost,
  });
  // @ts-ignore
  await supabase.rpc("increment_download_count", {
    listing_id: fileRecord.listing_id,
    file_id: fileId,
  });

  return { url: signedUrl.signedUrl };
}

export async function deleteListingFile(fileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data } = await supabase
    .from("listing_files")
    .select("*, listings(creator_id)")
    .eq("id", fileId)
    .single();
  const fileRecord = data as any;

  if (!fileRecord || fileRecord.listings?.creator_id !== user.id) {
    return { error: "Forbidden" };
  }

  await supabase.storage.from(STORAGE_BUCKETS.FILES).remove([fileRecord.file_path]);
  await supabase.from("listing_files").delete().eq("id", fileId);
  return { success: true };
}
