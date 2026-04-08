"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Clock,
  Shield,
  User,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUserProfile } from "@/actions/admin/users";

interface AdminUsersClientProps {
  initialUsers: AdminUserProfile[];
  initialTotal: number;
  initialPage: number;
  initialSearch: string;
  initialRole?: string;
  initialStatus?: string;
  error?: string;
}

const roleColors = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  moderator: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  creator: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  user: "bg-muted text-muted-foreground",
};

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  suspended: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  banned: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcons = {
  active: CheckCircle,
  suspended: Clock,
  banned: Ban,
};

export function AdminUsersClient({
  initialUsers,
  initialTotal,
  initialPage,
  initialSearch,
  initialRole,
  initialStatus,
  error,
}: AdminUsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(total / 20);

  const fetchUsers = useCallback(async (params: {
    page?: number;
    search?: string;
    role?: string;
    status?: string;
  }) => {
    setIsLoading(true);
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.search) searchParams.set("search", params.search);
    if (params.role) searchParams.set("role", params.role);
    if (params.status) searchParams.set("status", params.status);

    const res = await fetch(`/admin/users?${searchParams.toString()}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setIsLoading(false);
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchUsers({ page: 1, search, role, status });
    router.push(`/admin/users?page=1${search ? `&search=${search}` : ""}${role ? `&role=${role}` : ""}${status ? `&status=${status}` : ""}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUsers({ page: newPage, search, role, status });
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleFilterChange = (filterType: "role" | "status", value: string) => {
    const newValue = value === "all" ? undefined : value;
    if (filterType === "role") {
      setRole(newValue);
      fetchUsers({ page: 1, search, role: newValue, status });
    } else {
      setStatus(newValue);
      fetchUsers({ page: 1, search, role, status: newValue });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-destructive py-8">
          Error loading users: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and account status
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={role || "all"}
                onValueChange={(v) => handleFilterChange("role", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status || "all"}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {users.length} of {total} users
          </div>

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium">User</th>
                  <th className="text-left p-3 text-sm font-medium">Role</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Credits</th>
                  <th className="text-left p-3 text-sm font-medium">Joined</th>
                  <th className="text-right p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const StatusIcon = statusIcons[user.status];
                    return (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="flex items-center gap-3 hover:opacity-80"
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>
                                {user.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.display_name || user.username}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                @{user.username}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={roleColors[user.role]}
                          >
                            {user.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
                            {user.role === "moderator" && <Shield className="w-3 h-3 mr-1" />}
                            {user.role}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={statusColors[user.status]}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-sm">
                            {user.credit_balance?.toFixed(2) || "0.00"}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${user.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === "active" && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/users/${user.id}?action=suspend`}>
                                      <Clock className="w-4 h-4 mr-2" />
                                      Suspend
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/users/${user.id}?action=ban`}>
                                      <Ban className="w-4 h-4 mr-2" />
                                      Ban
                                    </Link>
                                  </DropdownMenuItem>
                                </>
                              )}
                              {user.status !== "active" && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/users/${user.id}?action=unban`}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Unban/Suspend
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
