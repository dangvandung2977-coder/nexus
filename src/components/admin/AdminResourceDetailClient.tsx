"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  RotateCcw,
  Star,
  FileText,
  ExternalLink,
  History,
  User,
  Calendar,
  Download,
  Heart,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ACTION_LABELS } from "@/lib/admin/audit";
import type { AdminListing } from "@/actions/admin/listings";
import type { AuditLogEntry } from "@/lib/admin/audit";

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

interface AdminResourceDetailClientProps {
  listing: AdminListing;
  auditLogs: AuditLogEntry[];
}

export function AdminResourceDetailClient({
  listing,
  auditLogs,
}: AdminResourceDetailClientProps) {
  const router = useRouter();
  const [currentListing, setCurrentListing] = useState(listing);
  const [moderationDialogOpen, setModerationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moderationReason, setModerationReason] = useState("");
  const [moderationAction, setModerationAction] = useState<"hide" | "unhide" | "remove">("hide");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModeration = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/resources/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          action: moderationAction,
          reason: moderationReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Resource ${moderationAction === "hide" ? "hidden" : moderationAction === "unhide" ? "unhidden" : "removed"} successfully`);
        setModerationDialogOpen(false);
        setModerationReason("");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to moderate resource");
      }
    } catch {
      toast.error("Failed to moderate resource");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/resources/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          reason: moderationReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Resource deleted successfully");
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete resource");
      }
    } catch {
      toast.error("Failed to delete resource");
    }
    setIsSubmitting(false);
  };

  const handleRestore = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/resources/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Resource restored successfully");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to restore resource");
      }
    } catch {
      toast.error("Failed to restore resource");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/resources">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Resource Details</h1>
          <p className="text-muted-foreground">View and manage resource</p>
        </div>
        <div className="flex gap-2">
          {currentListing.moderation_status === "hidden" || currentListing.moderation_status === "removed" ? (
            <Button variant="default" onClick={handleRestore} disabled={isSubmitting}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setModerationAction("hide");
                  setModerationDialogOpen(true);
                }}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">{currentListing.title}</h2>
                  <p className="text-muted-foreground mt-1">{currentListing.short_description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline" className={statusColors[currentListing.status]}>
                      {currentListing.status}
                    </Badge>
                    <Badge variant="outline" className={moderationColors[currentListing.moderation_status]}>
                      {currentListing.moderation_status.replace("_", " ")}
                    </Badge>
                    {currentListing.featured && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {currentListing.deleted_at && (
                      <Badge variant="destructive">
                        <Trash2 className="w-3 h-3 mr-1" />
                        Deleted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {currentListing.moderation_reason && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Moderation Reason
                  </div>
                  <p className="text-sm mt-1">{currentListing.moderation_reason}</p>
                  {currentListing.moderated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(currentListing.moderated_at), "PPp")}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Eye className="w-5 h-5 text-muted-foreground mx-auto" />
                  <div className="text-xl font-bold mt-1">{currentListing.view_count}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Download className="w-5 h-5 text-muted-foreground mx-auto" />
                  <div className="text-xl font-bold mt-1">{currentListing.download_count}</div>
                  <div className="text-xs text-muted-foreground">Downloads</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Heart className="w-5 h-5 text-muted-foreground mx-auto" />
                  <div className="text-xl font-bold mt-1">{currentListing.favorite_count}</div>
                  <div className="text-xs text-muted-foreground">Favorites</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <Star className="w-5 h-5 text-muted-foreground mx-auto" />
                  <div className="text-xl font-bold mt-1">{currentListing.popularity_score}</div>
                  <div className="text-xs text-muted-foreground">Popularity</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="activity">
            <TabsList>
              <TabsTrigger value="activity">
                <History className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {auditLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No activity logs found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="p-2 rounded-lg bg-muted">
                            <History className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {ACTION_LABELS[log.action_type] || log.action_type}
                            </div>
                            {log.note && (
                              <div className="text-xs text-muted-foreground">{log.note}</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creator</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/admin/users/${currentListing.creator_id}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {currentListing.creator?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {currentListing.creator?.display_name || currentListing.creator?.username}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{currentListing.creator?.username}
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-sm">{format(new Date(currentListing.created_at), "PP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-sm">{format(new Date(currentListing.updated_at), "PP")}</span>
              </div>
              {currentListing.category && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="text-sm">{currentListing.category.name}</span>
                </div>
              )}
              {currentListing.cover_image_url && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Cover</span>
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">External Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/listing/${currentListing.slug}`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Site
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={moderationDialogOpen} onOpenChange={setModerationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationAction === "hide" ? "Hide Resource" : "Unhide Resource"}
            </DialogTitle>
            <DialogDescription>
              {moderationAction === "hide"
                ? "This will hide the resource from public view"
                : "This will make the resource visible again"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Enter reason for this action..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModeration} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : moderationAction === "hide" ? "Hide" : "Unhide"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              This will permanently delete the resource. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Enter reason for deletion..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
