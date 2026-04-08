"use client";

import Link from "next/link";
import { Bell, User, LogOut, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUser } from "@/lib/admin/auth";

interface AdminHeaderProps {
  admin: {
    user: AdminUser | null;
    isAdmin: boolean;
    isModerator: boolean;
  };
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const user = admin.user;

  if (!user) return null;

  const initials = user.display_name?.slice(0, 2) || user.username.slice(0, 2);

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl shrink-0 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Admin Control Panel
        </span>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start hidden sm:block">
                <span className="text-sm font-medium">{user.display_name || user.username}</span>
                <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.display_name || user.username}</p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/creator/${user.username}`}>
                <User className="w-4 h-4 mr-2" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">
                <ChevronLeft className="w-4 h-4 mr-2" />
                User Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
