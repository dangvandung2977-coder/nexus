"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const adminLinks = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Credits",
    href: "/admin/credits",
    icon: CreditCard,
  },
  {
    label: "Resources",
    href: "/admin/resources",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl shrink-0 h-screen sticky top-0">
      <div className="p-6 border-b border-border/40">
        <Link href="/admin" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-8 h-8 rounded-xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20"
          >
            <Shield className="w-4 h-4 text-destructive-foreground" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">{APP_NAME}</span>
            <span className="text-xs text-muted-foreground">Admin Panel</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {adminLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href) && link.href !== "/admin";

          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileHover={{ x: 4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-destructive/10 text-destructive shadow-[inset_0_0_0_1px_rgba(var(--destructive),0.1)]"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-admin-pill"
                    className="absolute left-0 w-1 h-5 bg-destructive rounded-r-full"
                  />
                )}
                <link.icon className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-destructive" : "group-hover:text-destructive"
                )} />
                {link.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/40">
        <motion.div whileHover={{ x: -4 }}>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:bg-muted/50" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </motion.div>
      </div>
    </aside>
  );
}
