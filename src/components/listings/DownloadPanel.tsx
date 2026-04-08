"use client";

import { useState } from "react";
import { Download, Heart, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toggleFavorite } from "@/actions/comments";
import { getDownloadUrl } from "@/actions/files";
import type { Listing, ListingFile } from "@/types";
import { formatBytes } from "@/lib/utils";

interface DownloadPanelProps {
  listing: Listing;
  files: ListingFile[];
}

export function DownloadPanel({ listing, files }: DownloadPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const creditCost = Number((listing as any).credit_cost ?? 0);
  const isPaid = creditCost > 0;

  const handleDownload = async () => {
    if (files.length === 0) {
      toast.error("No files available for download.");
      return;
    }
    setDownloading(true);
    const primaryFile = files[0];
    const result = await getDownloadUrl(primaryFile.id);
    
    if (result.error) {
      // Handle specific error types
      if (result.requiresAuth) {
        toast.error(result.error, {
          action: {
            label: "Sign In",
            onClick: () => window.location.href = "/login"
          }
        });
      } else if (result.insufficientBalance) {
        toast.error(`Insufficient credits. You need ${result.required} Credits but have ${result.current}.`, {
          action: {
            label: "Get Credits",
            onClick: () => window.location.href = "/dashboard/wallet"
          }
        });
      } else {
        toast.error(result.error);
      }
    } else if (result.url) {
      try {
        // Force correctly named download by fetching as blob
        const response = await fetch(result.url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', primaryFile.file_name);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        toast.success(isPaid ? "Download successful! Credits deducted." : "Download successful!");
      } catch (err) {
        console.error("Blob download failed, falling back to direct link:", err);
        // Fallback for large files or CORS issues
        window.open(result.url, '_blank');
        toast.success("Download started (fallback)");
      }
    }
    setDownloading(false);
  };

  const handleFavorite = async () => {
    setFavoriting(true);
    const result = await toggleFavorite(listing.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setFavorited(result.favorited ?? false);
      toast.success(result.favorited ? "Added to favorites!" : "Removed from favorites.");
    }
    setFavoriting(false);
  };

  return (
    <div className="border border-border rounded-xl p-5 bg-card shadow-sm">
      {/* Price / Credit Cost */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-2xl font-bold">
          {isPaid 
            ? <span className="flex items-center gap-1.5"><Coins className="w-5 h-5 text-amber-500" />{creditCost} Credits</span>
            : listing.price === 0 ? "Free" : `$${listing.price}`}
        </span>
        {!isPaid && listing.price === 0 && listing.external_url && files.length === 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            External Link
          </span>
        )}
        {isPaid && (
          <span className="text-xs text-muted-foreground bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
            Premium
          </span>
        )}
      </div>

      <div className="space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={handleDownload}
          disabled={downloading || files.length === 0}
        >
          {downloading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" /> Download{files.length > 0 ? ` (${formatBytes(files[0].file_size)})` : ""}</>
          )}
        </Button>

        <Button
          variant={favorited ? "default" : "outline"}
          className="w-full"
          onClick={handleFavorite}
          disabled={favoriting}
        >
          {favoriting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Heart className={`w-4 h-4 mr-2 ${favorited ? "fill-current" : ""}`} />
          )}
          {favorited ? "Saved to Favorites" : "Save to Favorites"}
        </Button>
      </div>

      {files.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {files.length} files included
          </p>
          <div className="space-y-1">
            {files.slice(0, 3).map((file) => (
              <div key={file.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate flex-1 mr-2">{file.file_name}</span>
                <span>{formatBytes(file.file_size)}</span>
              </div>
            ))}
            {files.length > 3 && (
              <p className="text-xs text-muted-foreground">+{files.length - 3} more files</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
