import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyListingById } from "@/actions/listings";
import { ListingForm } from "@/components/forms/ListingForm";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit Listing" };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [listing, { data: categories }] = await Promise.all([
    getMyListingById(id),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  if (!listing) notFound();

  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit Listing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your resource details, files, and screenshots.
        </p>
      </div>
      <ListingForm categories={categories ?? []} listing={listing} />
    </div>
  );
}
