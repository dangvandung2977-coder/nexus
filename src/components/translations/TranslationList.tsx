"use client";

import { downloadTranslation, deleteTranslation } from "@/actions/translations";
import { formatDate } from "@/lib/utils";
import { Download, Loader2, CheckCircle, Clock, XCircle, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TranslationListProps {
  jobs: any[];
}

export function TranslationList({ jobs }: TranslationListProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDownload = async (jobId: string) => {
    setDownloading(jobId);
    const result = await downloadTranslation(jobId);
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      const link = document.createElement('a');
      link.href = result.url;
      const job = jobs.find(j => j.id === jobId);
      const fileName = job?.translated_filename || job?.original_filename || "translation";
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    }
    
    setDownloading(null);
  };

  const handleDelete = async (jobId: string) => {
    console.log("Delete triggered for jobId:", jobId);
    
    // TEMPORARY: Remove confirm to test interactivity
    // if (!confirm("Bạn có chắc chắn muốn xóa bản dịch này? Hành động này không thể hoàn tác.")) return;
    
    setIsDeleting(jobId);
    try {
      const result = await deleteTranslation(jobId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success("Đã xóa bản dịch thành công");
        router.refresh();
      }
    } catch (err) {
      toast.error("Đã xảy ra lỗi khi thực hiện yêu cầu.");
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{job.original_filename}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{job.translatable_line_count} lines</span>
                <span>{job.credit_cost} credits</span>
                <span>{formatDate(job.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getStatusBadge(job.status)}
            <div className="flex items-center gap-2">
              {job.status === "done" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(job.id)}
                  disabled={downloading === job.id || isDeleting === job.id}
                >
                  {downloading === job.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                onClick={() => handleDelete(job.id)}
                disabled={isDeleting === job.id}
              >
                {isDeleting === job.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}