import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/ListingCard";
import type { ListingWithCreator } from "@/types";

interface FeaturedListingsProps {
  listings: ListingWithCreator[];
  title?: string;
  viewAllHref?: string;
}

export function FeaturedListings({
  listings,
  title = "Featured Resources",
  viewAllHref = "/explore",
}: FeaturedListingsProps) {
  if (listings.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hand-picked by our team
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAllHref}>
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {listings.map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} index={i} />
        ))}
      </div>
    </section>
  );
}
