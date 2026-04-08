import type { Metadata } from "next";
import Link from "next/link";
import { Package, HardDrive, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Asset Manager" };

export default function AssetsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Asset Manager</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your uploaded files and images across all listings.
        </p>
      </div>

      <div className="border border-border rounded-xl p-5 bg-card/50 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">File Management</p>
          <p className="text-muted-foreground">
            Files are managed per-listing. Visit a listing&apos;s edit page to upload or remove files.
            Your files are stored securely in Supabase Storage.
          </p>
        </div>
      </div>

      <EmptyState
        icon={<HardDrive className="w-7 h-7 text-muted-foreground" />}
        title="Manage files per listing"
        description="Open any listing's edit page to upload cover images, screenshots, and downloadable files."
        action={{ label: "View My Listings", href: "/dashboard/listings" }}
      />
    </div>
  );
}
