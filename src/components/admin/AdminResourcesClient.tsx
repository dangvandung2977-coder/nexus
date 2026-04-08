"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Star,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminListing } from "@/actions/admin/listings";

interface AdminResourcesClientProps {
  initialListings: AdminListing[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
  initialStatus?: string;
  initialModeration?: string;
  error?: string;
}

const statusColors = {
  draft: "bg-gray-500/10 text-gray-500",
  published: "bg-emerald-500/10 text-emerald-500",
  archived: "bg-amber-500/10 text-amber-500",
  flagged: "bg-red-500/10 text-red-500",
};

const moderationColors = {
  approved: "bg-emerald-500/10 text-emerald-500",
  pending_review: "bg-amber-500/10 text-amber-500",
  hidden: "bg-gray-500/10 text-gray-500",
  removed: "bg-red-500/10 text-red-500",
};

export function AdminResourcesClient({
  initialListings,
  initialTotal,
  initialPage,
  initialSearch,
  initialStatus,
  initialModeration,
  error,
}: AdminResourcesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState(initialListings);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [moderationStatus, setModerationStatus] = useState(initialModeration);

  const totalPages = Math.ceil(total / 20);

  const fetchListings = useCallback(async (params: {
    page?: number;
    search?: string;
    status?: string;
    moderation?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.search) searchParams.set("search", params.search);
    if (params.status) searchParams.set("status", params.status);
    if (params.moderation) searchParams.set("moderation", params.moderation);

    const res = await fetch(`/admin/resources?${searchParams.toString()}`);
    const data = await res.json();
    setListings(data.listings || []);
    setTotal(data.total || 0);
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchListings({ page: 1, search, status, moderation: moderationStatus });
    const params = new URLSearchParams();
    params.set("page", "1");
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (moderationStatus) params.set("moderation", moderationStatus);
    router.push(`/admin/resources?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchListings({ page: newPage, search, status, moderation: moderationStatus });
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (moderationStatus) params.set("moderation", moderationStatus);
    router.push(`/admin/resources?${params.toString()}`);
  };

  const handleFilterChange = (filterType: "status" | "moderation", value: string) => {
    const newValue = value === "all" ? undefined : value;
    if (filterType === "status") {
      setStatus(newValue);
      fetchListings({ page: 1, search, status: newValue, moderation: moderationStatus });
    } else {
      setModerationStatus(newValue);
      fetchListings({ page: 1, search, status, moderation: newValue });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive py-8">
          Error loading resources: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Moderation</h1>
        <p className="text-muted-foreground">
          Manage and moderate user resources
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={status || "all"}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={moderationStatus || "all"}
                onValueChange={(v) => handleFilterChange("moderation", v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Moderation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moderation</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_review">Pending</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {listings.length} of {total} resources
          </div>

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">Resource</th>
                  <th className="text-left p-3 text-sm font-medium">Creator</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Moderation</th>
                  <th className="text-left p-3 text-sm font-medium">Stats</th>
                  <th className="text-right p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No resources found
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3">
                        <Link
                          href={`/admin/resources/${listing.id}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[200px]">{listing.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {listing.short_description}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${listing.creator_id}`}
                          className="flex items-center gap-2 hover:opacity-80"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {listing.creator?.username?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">@{listing.creator?.username}</span>
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={statusColors[listing.status]}>
                          {listing.status}
                        </Badge>
                        {listing.featured && (
                          <Star className="w-3 h-3 text-amber-500 ml-1 inline" />
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={moderationColors[listing.moderation_status]}>
                          {listing.moderation_status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-muted-foreground">
                          <div>V: {listing.view_count}</div>
                          <div>D: {listing.download_count}</div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/resources/${listing.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
