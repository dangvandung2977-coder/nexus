import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Heart,
  Eye,
  Calendar,
  Tag,
  ExternalLink,
  Shield,
  Verified,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getListing } from "@/actions/listings";
import { getComments, getReviews, isFavorited } from "@/actions/comments";
import { formatDate, formatNumber, formatBytes } from "@/lib/utils";
import { CommentThread } from "@/components/comments/CommentThread";
import { DownloadPanel } from "@/components/listings/DownloadPanel";
import { ListingGallery } from "@/components/listings/ListingGallery";
import { APP_NAME } from "@/lib/constants";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing) return { title: "Not Found" };
  return {
    title: listing.title,
    description: listing.short_description,
    openGraph: {
      title: `${listing.title} — ${APP_NAME}`,
      description: listing.short_description,
      images: listing.cover_image_url ? [listing.cover_image_url] : [],
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListing(slug) as any;
  if (!listing) notFound();

  const [comments, reviews] = await Promise.all([
    getComments(listing.id),
    getReviews(listing.id),
  ]);

  const creator = listing.profiles;
  const images = listing.listing_images ?? [];
  const files = listing.listing_files ?? [];
  const versions = listing.listing_versions ?? [];
  const tags = listing.listing_tags ?? [];
  const avgRating = reviews.length > 0
    ? reviews.reduce((a: number, r: any) => a + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
        <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {listing.categories && (
          <>
            <Link href={`/explore?category=${listing.categories.slug}`} className="hover:text-foreground transition-colors">
              {listing.categories.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="text-foreground font-medium truncate">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cover */}
          {listing.cover_image_url && (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
              <Image
                src={listing.cover_image_url}
                alt={listing.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Gallery */}
          {images.length > 0 && <ListingGallery images={images} />}

          {/* Title + Meta */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <h1 className="text-3xl font-bold tracking-tight flex-1">{listing.title}</h1>
              <div className="flex items-center gap-2">
                {listing.featured && (
                  <Badge className="bg-amber-500 text-white border-0">⭐ Featured</Badge>
                )}
                {listing.categories && (
                  <Badge variant="secondary">
                    {listing.categories.icon} {listing.categories.name}
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
              {listing.short_description}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Download className="w-4 h-4" /> {formatNumber(listing.download_count)} downloads
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" /> {formatNumber(listing.favorite_count)} favorites
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> {formatNumber(listing.view_count)} views
              </span>
              {avgRating && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {avgRating.toFixed(1)} ({reviews.length} reviews)
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {formatDate(listing.created_at)}
              </span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {tags.map(({ tags: tag }: any) => (
                  <Link
                    key={tag.id}
                    href={`/explore?tag=${tag.slug}`}
                    className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="changelog">
                Changelog {versions.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{versions.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="comments">
                Comments {comments.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{comments.length}</Badge>}
              </TabsTrigger>
              {reviews.length > 0 && (
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="border border-border rounded-xl bg-muted/30 p-6 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 transition-colors">
                <div
                  className="prose prose-sm prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: listing.description }}
                />
              </div>
            </TabsContent>

            <TabsContent value="changelog" className="mt-6">
              {versions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No changelog available.</p>
              ) : (
                <div className="space-y-4">
                  {versions.map((v: any) => (
                    <div key={v.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="font-mono">v{v.version_number}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(v.created_at)}</span>
                      </div>
                      {v.changelog && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.changelog}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6">
              <CommentThread listingId={listing.id} creatorId={listing.creator_id} initialComments={comments as any} />
            </TabsContent>

            {reviews.length > 0 && (
              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="flex gap-3 border-b border-border pb-4">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {review.profiles?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {review.profiles?.display_name ?? review.profiles?.username}
                          </span>
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                        </div>
                        {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Download Panel */}
          <DownloadPanel listing={listing} files={files} />

          {/* Creator Card */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Creator</h3>
            <Link href={`/creator/${creator.username}`} className="flex items-center gap-3 group">
              <Avatar className="w-10 h-10">
                <AvatarImage src={creator.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {(creator.display_name ?? creator.username).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {creator.display_name ?? creator.username}
                  </span>
                  {creator.verified && <Verified className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />}
                </div>
                <span className="text-xs text-muted-foreground">@{creator.username}</span>
              </div>
            </Link>
            {creator.bio && (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                {creator.bio}
              </p>
            )}
          </div>

          {/* Compatibility */}
          {(listing.platforms?.length > 0 || listing.supported_versions?.length > 0) && (
            <div className="border border-border rounded-xl p-5 bg-card">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Compatibility</h3>
              {listing.platforms?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium mb-1.5">Platforms</p>
                  <div className="flex flex-wrap gap-1">
                    {listing.platforms.map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {listing.supported_versions?.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1.5">Versions</p>
                  <div className="flex flex-wrap gap-1">
                    {listing.supported_versions.map((v: string) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className="border border-border rounded-xl p-5 bg-card">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Files</h3>
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1 mr-2">{file.file_name}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Link */}
          {listing.external_url && (
            <Button variant="outline" className="w-full" asChild>
              <a href={listing.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> View Documentation
              </a>
            </Button>
          )}

          {/* Report */}
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
            <Shield className="w-3.5 h-3.5 mr-2" /> Report this resource
          </Button>
        </div>
      </div>
    </div>
  );
}
