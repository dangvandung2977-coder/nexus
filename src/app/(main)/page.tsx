import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { TrendingSection } from "@/components/home/TrendingSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { SkeletonListingGrid } from "@/components/shared/SkeletonCard";
import { getFeaturedListings, getTrendingListings } from "@/actions/listings";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} — Game Resources Marketplace`,
  description: APP_DESCRIPTION,
};

async function FeaturedSection() {
  const [featured, trending] = await Promise.all([
    getFeaturedListings(4),
    getTrendingListings(8),
  ]);
  return (
    <>
      {featured.length > 0 && (
        <FeaturedListings listings={featured as any} title="Featured Resources" />
      )}
      <TrendingSection listings={trending as any} />
    </>
  );
}

async function CategoriesSection() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  return <CategoryGrid categories={categories ?? []} />;
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><SkeletonListingGrid count={8} /></div>}>
        <FeaturedSection />
      </Suspense>
      <Suspense fallback={null}>
        <CategoriesSection />
      </Suspense>
    </>
  );
}
