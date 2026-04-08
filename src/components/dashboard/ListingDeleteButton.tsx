"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteListing } from "@/actions/listings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ListingDeleteButtonProps {
  id: string;
  title: string;
}

export function ListingDeleteButton({ id, title }: ListingDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${title}"? Thao tác này sẽ chuyển listing vào mục lưu trữ.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteListing(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Đã xóa listing thành công");
        router.refresh();
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi khi xóa listing");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </Button>
  );
}
