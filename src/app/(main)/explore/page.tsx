"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { CategoryPill } from "@/components/shared/CategoryPill";
import { getListings } from "@/actions/listings";
import { SORT_OPTIONS, SUPPORTED_PLATFORMS } from "@/lib/constants";
import type { ListingWithCreator } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { QuickCheckin } from "@/components/dashboard/QuickCheckin";

const CATEGORIES = [
  { name: "All", slug: "" },
  { name: "Mods", slug: "mods", icon: "⚙️" },
  { name: "Plugins", slug: "plugins", icon: "🔌" },
  { name: "Resource Packs", slug: "resource-packs", icon: "🎨" },
  { name: "Scripts", slug: "scripts", icon: "📜" },
  { name: "Templates", slug: "templates", icon: "📐" },
  { name: "Asset Packs", slug: "asset-packs", icon: "🗂️" },
  { name: "Maps", slug: "maps", icon: "🗺️" },
];

import { Suspense } from "react";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<ListingWithCreator[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");
  const [platform, setPlatform] = useState(searchParams.get("platform") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setSort(searchParams.get("sort") ?? "newest");
    setPlatform(searchParams.get("platform") ?? "");
  }, [searchParams]);

  const debouncedSearch = useDebounce(search, 400);

  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    return params.toString();
  }, [searchParams]);

  // Update URL implicitly on state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    
    if (debouncedSearch !== (params.get("search") || "")) { params.set("search", debouncedSearch); changed = true; }
    if (!debouncedSearch && params.has("search")) { params.delete("search"); changed = true; }
    
    if (category !== (params.get("category") || "")) { params.set("category", category); changed = true; }
    if (!category && params.has("category")) { params.delete("category"); changed = true; }

    if (sort !== (params.get("sort") || "newest")) { params.set("sort", sort); changed = true; }
    if (sort === "newest" && params.has("sort")) { params.delete("sort"); changed = true; }

    if (platform !== (params.get("platform") || "")) { params.set("platform", platform); changed = true; }
    if (!platform && params.has("platform")) { params.delete("platform"); changed = true; }

    if (changed) {
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearch, category, sort, platform, router, searchParams]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const result = await getListings({
      search: debouncedSearch || undefined,
      category: category || undefined,
      sort,
      platform: platform || undefined,
    });
    if (result.error) {
      toast.error(result.error);
      setListings([]);
      setCount(0);
    } else {
      setListings(result.data as ListingWithCreator[]);
      setCount(result.count);
    }
    setLoading(false);
  }, [debouncedSearch, category, sort, platform]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setSort("newest");
    setPlatform("");
    router.push("/explore", { scroll: false });
  };

  const hasFilters = search || category || sort !== "newest" || platform;

  return (
    <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-10">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-8 lg:mb-12 bg-card border border-border/50 isolate">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/90 to-background z-0" />
        <img 
          src="/images/hero-bg.png" 
          alt="Hero Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-lighten pointer-events-none -z-10"
        />
        <div className="relative z-10 p-8 md:p-14 lg:p-20 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <Badge variant="outline" className="mb-5 bg-background/50 backdrop-blur-md px-3 py-1 text-xs">
              <Sparkles className="w-3 h-3 mr-2 text-primary" /> Premium Directory
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5">
              Discover <span className="gradient-text">Resources</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse {count > 0 ? count.toLocaleString() : "thousands of"} game mods, high-performance plugins, and creative assets built for modern creators.
            </p>
          </motion.div>
        </div>
        {/* Quick check-in strip inside hero bottom */}
        <div className="relative z-10 px-8 pb-6 md:px-14 lg:px-20">
          <QuickCheckin />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Sidebar (Categories) */}
        <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24">
          <div className="glass p-4 rounded-2xl">
            <h3 className="font-semibold px-2 mb-4 text-xs text-muted-foreground uppercase tracking-widest">Categories</h3>
            <nav className="flex flex-wrap lg:flex-col gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setCategory(cat.slug)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                    category === cat.slug
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {cat.icon && <span className="text-base">{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          {/* Glassmorphism Sticky Filter Bar */}
          <div className="sticky top-[72px] z-40 p-3 mb-6 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/40 border-transparent hover:border-border focus-visible:border-primary transition-colors focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Select value={sort} onValueChange={(val) => setSort(val || "newest")}>
                <SelectTrigger className="w-[140px] sm:w-[160px] bg-muted/40 border-transparent hover:border-border transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={platform || "none"} onValueChange={(val) => setPlatform(val === "none" ? "" : (val || ""))}>
                <SelectTrigger className="w-[140px] sm:w-[160px] bg-muted/40 border-transparent hover:border-border transition-colors">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Platforms</SelectItem>
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-5">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          title="No resources found"
          description="Try adjusting your search or filters to find what you're looking for."
          action={{ label: "Clear Filters", onClick: clearFilters }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-5">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      )}
      </div></div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-10 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
