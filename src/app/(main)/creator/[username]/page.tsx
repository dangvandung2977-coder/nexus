import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, Verified, MessageSquare, Package, Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getProfile } from "@/actions/profile";
import { getCreatorListings } from "@/actions/listings";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatNumber } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "Creator Not Found" };
  return {
    title: `${profile.display_name ?? profile.username} — ${APP_NAME}`,
    description: profile.bio ?? `Check out ${profile.username}'s resources on ${APP_NAME}.`,
  };
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const listings = await getCreatorListings(profile.id) as any[];
  const totalDownloads = listings.reduce((a: number, l: any) => a + (l.download_count ?? 0), 0);

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-purple-500/10 to-cyan-500/10">
        {profile.banner_url && (
          <Image src={profile.banner_url} alt="Banner" fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="relative -mt-16 pb-8 flex flex-col sm:flex-row sm:items-end gap-4">
          <Avatar className="w-28 h-28 border-4 border-background shadow-xl">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
              {(profile.display_name ?? profile.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between flex-1 gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">
                  {profile.display_name ?? profile.username}
                </h1>
                {profile.verified && (
                  <Verified className="w-5 h-5 text-primary fill-primary" />
                )}
                {profile.role !== "user" && (
                  <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            </div>

            <div className="flex items-center gap-2">
              {profile.website && (
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4" />
                  </a>
                </Button>
              )}
              {profile.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 4.076H5.078z"/></svg>
                  </a>
                </Button>
              )}
              {profile.github && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                  </a>
                </Button>
              )}
              <Button size="sm">
                <MessageSquare className="w-4 h-4 mr-2" /> Message
              </Button>
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="text-muted-foreground mb-6 max-w-2xl">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm">
          <div className="text-center">
            <p className="text-2xl font-bold">{listings.length}</p>
            <p className="text-xs text-muted-foreground">Resources</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatNumber(totalDownloads)}</p>
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Joined</p>
            <p className="text-xs">{formatDate(profile.created_at)}</p>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Listings */}
        <h2 className="text-xl font-bold mb-6">Resources by {profile.display_name ?? profile.username}</h2>

        {listings.length === 0 ? (
          <EmptyState
            icon={<Package className="w-7 h-7 text-muted-foreground" />}
            title="No published resources yet"
            description="This creator hasn't published any resources yet."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-16">
            {listings.map((listing: any, i: number) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
