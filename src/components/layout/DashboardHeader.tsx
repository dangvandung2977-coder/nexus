"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, Bell, User, Plus, MessageSquare, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/actions/auth";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";

export function DashboardHeader() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-4 md:gap-8">
        <div className="relative w-full max-w-sm hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search listings, creators..."
            className="w-full bg-muted/50 pl-9 transition-all focus:bg-muted"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" asChild>
          <Link href="/dashboard/messages">
            <MessageSquare className="h-5 w-5" />
          </Link>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="relative h-9 w-9 rounded-full overflow-hidden">
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary/10 text-primary uppercase text-xs font-bold">
                  {(profile?.display_name || profile?.username || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.display_name || profile?.username || "Account"}</p>
                  <p className="text-xs leading-none text-muted-foreground">@{profile?.username || "user"}</p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={`/creator/${profile?.username || profile?.id}`} />}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/listings" />}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> My Listings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
