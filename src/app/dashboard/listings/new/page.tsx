import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/forms/ListingForm";

export const metadata: Metadata = { title: "New Listing" };

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="p-6 lg:p-8 w-full max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New Listing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fill in the details below to publish your resource.
        </p>
      </div>
      <ListingForm categories={categories ?? []} />
    </div>
  );
}
