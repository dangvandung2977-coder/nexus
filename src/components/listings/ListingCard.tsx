"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Download, Heart, Verified } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/utils";
import type { ListingWithCreator } from "@/types";

interface ListingCardProps {
  listing: ListingWithCreator;
  index?: number;
}

export function ListingCard({ listing, index = 0 }: ListingCardProps) {
  const creator = listing.profiles || { username: "unknown", display_name: "Deleted User", avatar_url: null, verified: false };
  const coverImage =
    listing.cover_image_url ??
    listing.listing_images?.[0]?.image_path ??
    null;

  const category = listing.categories;
  const tags = listing.listing_tags?.slice(0, 3) ?? [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ 
        duration: 0.35, 
        delay: index * 0.05,
        scale: { type: "spring", stiffness: 400, damping: 17 }
      }}
      className="group relative flex flex-col rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-colors duration-300 overflow-hidden cursor-pointer"
    >
      {/* Cover Image */}
      <Link href={`/listing/${listing.slug}`} className="block relative">
        <div className="aspect-video bg-muted overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-4xl opacity-30">📦</span>
            </div>
          )}
        </div>

        {/* Featured badge */}
        {listing.featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500/90 text-white border-0 text-xs">
              ⭐ Featured
            </Badge>
          </div>
        )}

        {/* Category badge */}
        {category && (
          <div className="absolute top-2 right-2">
            <Badge
              variant="secondary"
              className="text-xs bg-background/80 backdrop-blur-sm"
              style={category.color ? { borderColor: category.color, color: category.color } : undefined}
            >
              {category.icon && <span className="mr-1">{category.icon}</span>}
              {category.name}
            </Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Creator */}
        <Link
          href={`/creator/${creator.username}`}
          className="flex items-center gap-2 mb-2.5 group/creator w-fit"
        >
          <Avatar className="w-5 h-5">
            <AvatarImage src={creator.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {(creator.display_name ?? creator.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground group-hover/creator:text-foreground transition-colors">
            {creator.display_name ?? creator.username}
          </span>
          {creator.verified && (
            <Verified className="w-3 h-3 text-primary fill-primary" />
          )}
        </Link>

        {/* Title */}
        <Link href={`/listing/${listing.slug}`}>
          <h3 className="font-semibold text-sm leading-snug mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {listing.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 flex-1 line-clamp-2 whitespace-pre-wrap">
          {listing.short_description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map(({ tags: tag }) => (
              <span
                key={tag.id}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs">
              <Download className="w-3 h-3" />
              {formatNumber(listing.download_count)}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Heart className="w-3 h-3" />
              {formatNumber(listing.favorite_count)}
            </span>
          </div>
          <span className="text-xs font-semibold text-primary">
            {listing.credit_cost > 0 
              ? `${listing.credit_cost} Credits` 
              : listing.price === 0 ? "Free" : `$${listing.price}`}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
