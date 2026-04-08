"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  CreditCard,
  TrendingUp,
  ArrowUpDown,
  Eye,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WalletWithProfile } from "@/actions/admin/credits";

interface AdminCreditsClientProps {
  initialWallets: WalletWithProfile[];
  initialTotal: number;
  initialStats: {
    totalCreditsInCirculation: number;
    totalTransactions: number;
    totalAdjustments: number;
    totalRefunds: number;
    todayTransactions: number;
  } | null;
  error?: string;
}

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-500",
  suspended: "bg-amber-500/10 text-amber-500",
  banned: "bg-destructive/10 text-destructive",
};

export function AdminCreditsClient({
  initialWallets,
  initialTotal,
  initialStats,
  error,
}: AdminCreditsClientProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState(initialWallets);
  const [total, setTotal] = useState(initialTotal);
  const [stats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"balance" | "created_at">("balance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(false);

  const fetchWallets = useCallback(async (params: {
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    setIsLoading(true);
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    searchParams.set("sortBy", params.sortBy || "balance");
    searchParams.set("sortOrder", params.sortOrder || "desc");

    const res = await fetch(`/admin/credits?${searchParams.toString()}`);
    const data = await res.json();
    setWallets(data.wallets || []);
    setTotal(data.total || 0);
    setIsLoading(false);
  }, []);

  const handleSearch = () => {
    fetchWallets({ search, sortBy, sortOrder });
  };

  const handleSort = (column: "balance" | "created_at") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    fetchWallets({ search, sortBy: column, sortOrder: sortOrder === "asc" ? "desc" : "asc" });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive py-8">
          Error loading credits: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground">
          View and manage user credit wallets
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total in Circulation
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalCreditsInCirculation.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admin Adjustments
            </CardTitle>
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalAdjustments.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Activity
            </CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.todayTransactions.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {wallets.length} of {total} wallets
          </div>

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">User</th>
                  <th
                    className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("balance")}
                  >
                    <div className="flex items-center gap-1">
                      Balance
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th
                    className="text-left p-3 text-sm font-medium cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-right p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No wallets found
                    </td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-3">
                        <Link
                          href={`/admin/users/${wallet.user_id}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={wallet.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {(wallet.profile?.username?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {wallet.profile?.display_name || wallet.profile?.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{wallet.profile?.username}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono font-medium">
                            {wallet.balance.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={statusColors[wallet.profile?.status as keyof typeof statusColors] || statusColors.active}
                        >
                          {wallet.profile?.status || "active"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(wallet.created_at), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/users/${wallet.user_id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
