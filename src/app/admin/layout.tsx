import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await checkAdminAccess();
  
  if (!admin.user || !admin.isStaff) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader admin={admin} />
        <main className="flex-1 overflow-y-auto bg-muted/20 scroll-smooth">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
