import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Edit, Trash2, Eye, EyeOff, Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyListings } from "@/actions/listings";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatNumber } from "@/lib/utils";
import { ListingToggle } from "@/components/dashboard/ListingToggle";
import { ListingDeleteButton } from "@/components/dashboard/ListingDeleteButton";

export const metadata: Metadata = { title: "My Listings" };

export default async function ListingsPage() {
  const listings = await getMyListings() as any[];

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="w-4 h-4 mr-2" /> New Listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Create your first resource listing to share with the community."
          action={{ label: "Create Listing", href: "/dashboard/listings/new" }}
        />
      ) : (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium text-center">Status</th>
                <th className="px-5 py-3 font-medium text-right hidden sm:table-cell">Downloads</th>
                <th className="px-5 py-3 font-medium text-right hidden md:table-cell">Updated</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-medium truncate max-w-xs">{listing.title}</p>
                      {listing.categories?.name && (
                        <p className="text-xs text-muted-foreground">{listing.categories.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge
                      variant={listing.status === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {listing.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden sm:table-cell text-muted-foreground">
                    <span className="flex items-center justify-end gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {formatNumber(listing.download_count ?? 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden md:table-cell text-muted-foreground text-xs">
                    {formatDate(listing.updated_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ListingToggle id={listing.id} status={listing.status} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/dashboard/listings/${listing.id}/edit`}>
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/listing/${listing.slug}`} target="_blank">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                      <ListingDeleteButton id={listing.id} title={listing.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
