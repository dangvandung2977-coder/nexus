"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Plus,
  HardDrive,
  Settings,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  Wallet,
  Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const sidebarLinks = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "My Listings",
    href: "/dashboard/listings",
    icon: Package,
    exact: true,
  },
  {
    label: "New Listing",
    href: "/dashboard/listings/new",
    icon: Plus,
  },
  {
    label: "Asset Manager",
    href: "/dashboard/assets",
    icon: HardDrive,
  },
  {
    label: "Translations",
    href: "/dashboard/translations",
    icon: Languages,
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    label: "Wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-xl shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border/40">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20"
          >
            <Package className="w-4 h-4 text-primary-foreground" />
          </motion.div>
          <span className="font-bold text-base tracking-tight">{APP_NAME}</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {sidebarLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href) && link.href !== "/dashboard";

          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileHover={{ x: 4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)]"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-sidebar-pill"
                    className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                  />
                )}
                <link.icon className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-primary"
                )} />
                {link.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/40">
        <motion.div whileHover={{ x: -4 }}>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:bg-muted/50" asChild>
            <Link href="/">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Marketplace
            </Link>
          </Button>
        </motion.div>
      </div>
    </aside>
  );
}
