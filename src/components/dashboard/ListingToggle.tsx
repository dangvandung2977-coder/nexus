"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { togglePublish } from "@/actions/listings";

interface ListingToggleProps {
  id: string;
  status: string;
}

export function ListingToggle({ id, status }: ListingToggleProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const result = await togglePublish(id, currentStatus);
    if (result.error) {
      toast.error(result.error);
    } else {
      setCurrentStatus(result.status!);
      toast.success(result.status === "published" ? "Listing published!" : "Listing unpublished.");
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleToggle}
      disabled={loading}
      title={currentStatus === "published" ? "Unpublish" : "Publish"}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : currentStatus === "published" ? (
        <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
      ) : (
        <Eye className="w-3.5 h-3.5 text-primary" />
      )}
    </Button>
  );
}
