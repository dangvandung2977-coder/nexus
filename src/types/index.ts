import type { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Platform = Database["public"]["Tables"]["platforms"]["Row"];

export type Listing = Database["public"]["Tables"]["listings"]["Row"] & { credit_cost: number };
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"] & { credit_cost?: number };
export type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"] & { credit_cost?: number };

export type ListingVersion =
  Database["public"]["Tables"]["listing_versions"]["Row"];
export type ListingFile = Database["public"]["Tables"]["listing_files"]["Row"];
export type ListingImage = Database["public"]["Tables"]["listing_images"]["Row"];

export type Tag = Database["public"]["Tables"]["tags"]["Row"];
export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"];
export type Download = Database["public"]["Tables"]["downloads"]["Row"] & { credit_cost: number };
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];

// Enriched types returned from joins
export type ListingWithCreator = Listing & {
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "verified">;
  categories: Pick<Category, "id" | "name" | "slug" | "color" | "icon"> | null;
  listing_images: Pick<ListingImage, "id" | "image_path" | "alt_text" | "sort_order">[];
  listing_tags: { tags: Pick<Tag, "id" | "name" | "slug"> }[];
};

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  replies?: CommentWithAuthor[];
};

export type ReviewWithAuthor = Review & {
  profiles: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

export type MessageWithProfiles = Message & {
  sender: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  recipient: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

export type SortOption = "newest" | "oldest" | "trending" | "most_downloaded" | "top_rated";
export type ListingStatus = "draft" | "published" | "archived" | "flagged";

// Wallet & Credit System
export type CreditWallet = Database["public"]["Tables"]["credit_wallets"]["Row"];
export type CreditTransaction = Database["public"]["Tables"]["credit_transactions"]["Row"];
export type DailyCheckin = Database["public"]["Tables"]["daily_checkins"]["Row"];
export type TransactionType = CreditTransaction["type"];

// Translation System
// @ts-ignore - table added via migration
export type TranslationJob = Database["public"]["Tables"]["translation_jobs"]["Row"];
// @ts-ignore - table added via migration
export type TranslationJobStatus = "pending" | "processing" | "done" | "failed";

export interface EstimateResult {
  translatableLineCount: number;
  estimatedCreditCost: number;
  fileSize: number;
  fileName: string;
}
