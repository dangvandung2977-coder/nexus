import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Messages" };

export default function DashboardMessagesPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Direct messages from other creators and users.
        </p>
      </div>
      <EmptyState
        icon={<MessageSquare className="w-7 h-7 text-muted-foreground" />}
        title="No messages yet"
        description="When someone messages you, it will appear here."
      />
    </div>
  );
}
