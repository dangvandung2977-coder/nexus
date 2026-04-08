"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  Package,
  Search,
  Menu,
  X,
  Bell,
  LogOut,
  User,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Coins,
  Wallet,
  Languages,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { signOut } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/constants";
import type { Profile } from "@/types";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/translate", label: "Translation" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
        // Fetch wallet balance separately (table exists after migration)
        supabase
          // @ts-ignore – table added via migration
          .from("credit_wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single()
          .then(({ data }: { data: { balance: number } | null }) => {
            if (data) setBalance(data.balance);
          });
      }
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  };

  // Hover open helpers with a short leave delay
  const handleMenuEnter = () => {
    clearTimeout(leaveTimer.current);
    setDropdownOpen(true);
  };
  const handleMenuLeave = () => {
    leaveTimer.current = setTimeout(() => setDropdownOpen(false), 120);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-[2000px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Package className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Nav */}
          {/* Center Nav */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-semibold transition-all duration-200 px-4 py-2 rounded-xl",
                  pathname === link.href
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-muted-foreground"
              asChild
            >
              <Link href="/explore">
                <Search className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {profile ? (
              <>
                <Button variant="default" size="sm" asChild className="hidden sm:flex">
                  <Link href="/dashboard/listings/new">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Publish
                  </Link>
                </Button>

                {/* Hover-activated profile dropdown */}
                <div
                  onMouseEnter={handleMenuEnter}
                  onMouseLeave={handleMenuLeave}
                  className="relative"
                >
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2 px-2 h-9" />}>
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={profile.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                          {(profile.display_name || profile.username || "U").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {/* Coin balance */}
                      {balance !== null && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-yellow-500 dark:text-yellow-400 hidden sm:flex">
                          <Coins className="w-3.5 h-3.5" />
                          {Math.floor(balance).toLocaleString()}
                        </span>
                      )}
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="w-56 p-1.5 shadow-xl shadow-black/10 dark:shadow-black/40"
                      onMouseEnter={handleMenuEnter}
                      onMouseLeave={handleMenuLeave}
                    >
                      {/* User header */}
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          <div className="flex items-center gap-2.5 py-0.5">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={profile.avatar_url ?? undefined} />
                              <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                                {(profile.display_name || profile.username || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {profile.display_name || profile.username || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                @{profile.username || "user"}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuLabel>
                      </DropdownMenuGroup>

                      {/* Wallet balance strip */}
                      <div className="mx-1.5 my-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-xs font-medium text-foreground">Credits</span>
                        </div>
                        <span className="text-sm font-bold text-yellow-500">
                          {balance !== null ? Math.floor(balance).toLocaleString() : "—"}
                        </span>
                      </div>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem render={<Link href={`/creator/${profile.username || profile.id}`} />}>
                        <User className="w-4 h-4 mr-2 text-foreground/70" />
                        <span className="text-foreground">My Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard" />}>
                        <LayoutDashboard className="w-4 h-4 mr-2 text-foreground/70" />
                        <span className="text-foreground">Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/wallet" />}>
                        <Wallet className="w-4 h-4 mr-2 text-foreground/70" />
                        <span className="text-foreground">Wallet</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {profile && (
                <Link
                  href="/dashboard/listings/new"
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Publish Resource
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
