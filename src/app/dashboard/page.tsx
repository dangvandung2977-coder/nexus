import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Package, Download, Heart, Eye, TrendingUp, Plus, ArrowRight, Coins } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getMyListings } from "@/actions/listings";
import { getWallet } from "@/actions/wallet";
import { getCheckinStatus } from "@/actions/checkin";
import { formatNumber, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DailyCheckin } from "@/components/dashboard/DailyCheckin";

export const metadata: Metadata = { title: "Dashboard" };

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [listings, profileResponse, { wallet }, checkinStatus] = await Promise.all([
    getMyListings(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    getWallet(),
    getCheckinStatus(),
  ]);
  const profile = profileResponse.data as any;

  const published = listings.filter((l: any) => l.status === "published");
  const drafts = listings.filter((l: any) => l.status === "draft");
  const totalDownloads = listings.reduce((a: number, l: any) => a + (l.download_count ?? 0), 0);
  const totalFavorites = listings.reduce((a: number, l: any) => a + (l.favorite_count ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {profile?.display_name ?? profile?.username ?? "Creator"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s an overview of your marketplace activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/listings/new">
            <Plus className="w-4 h-4 mr-2" /> New Listing
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Total Listings" value={listings.length} sub={`${published.length} published`} />
        <StatCard icon={Download} label="Downloads" value={formatNumber(totalDownloads)} sub="All time" />
        <StatCard icon={Heart} label="Favorites" value={formatNumber(totalFavorites)} sub="All time" />
        <StatCard icon={Coins} label="Credits" value={Math.floor(wallet?.balance ?? 0).toLocaleString()} sub="Available" color="text-yellow-500" />
      </div>

      {/* Daily Check-in */}
      <div className="mb-8">
        <DailyCheckin initialStatus={checkinStatus} />
      </div>

      {/* Recent Listings */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Listings</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/listings">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>

        {listings.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">No listings yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Publish your first resource to get started.
            </p>
            <Button asChild>
              <Link href="/dashboard/listings/new">
                <Plus className="w-4 h-4 mr-2" /> Create Listing
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {listings.slice(0, 5).map((listing: any) => (
              <div key={listing.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(listing.updated_at)}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" /> {listing.download_count ?? 0}
                  </span>
                  <Badge
                    variant={listing.status === "published" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {listing.status}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/listings/${listing.id}/edit`}>Edit</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
