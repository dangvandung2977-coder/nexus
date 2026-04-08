"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Shield,
  Ban,
  Clock,
  CheckCircle,
  CreditCard,
  FileText,
  History,
  AlertTriangle,
  Plus,
  Minus,
  ExternalLink,
  Calendar,
  Download,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ACTION_LABELS } from "@/lib/admin/audit";
import type { AdminUserProfile } from "@/actions/admin/users";
import type { CreditTransaction } from "@/actions/admin/credits";
import type { AdminListing } from "@/actions/admin/listings";
import type { AuditLogEntry } from "@/lib/admin/audit";

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

const transactionIcons: Record<string, React.ElementType> = {
  daily_reward: Sparkles,
  download_cost: Download,
  translation_cost: FileText,
  admin_adjust: Minus,
  refund: Plus,
};

interface AdminUserDetailClientProps {
  user: AdminUserProfile;
  initialTransactions: CreditTransaction[];
  initialListings: AdminListing[];
  auditLogs: AuditLogEntry[];
  initialAction?: string;
}

export function AdminUserDetailClient({
  user,
  initialTransactions,
  initialListings,
  auditLogs,
  initialAction,
}: AdminUserDetailClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [listings] = useState(initialListings);
  const [logs] = useState(auditLogs);

  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditType, setCreditType] = useState<"admin_adjust" | "refund">("admin_adjust");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialAction === "ban") {
      setBanDialogOpen(true);
    } else if (initialAction === "suspend") {
      setBanDuration("temporary");
      setBanDialogOpen(true);
    } else if (initialAction === "unban") {
      handleStatusChange("active", "User reinstated by admin");
    }
  }, [initialAction]);

  const handleCreditAdjustment = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!creditNote.trim()) {
      toast.error("Please provide a reason for this adjustment");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/credits/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount,
          note: creditNote,
          type: creditType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Credits ${amount > 0 ? "added" : "deducted"} successfully`);
        setCreditDialogOpen(false);
        setCreditAmount("");
        setCreditNote("");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to adjust credits");
      }
    } catch {
      toast.error("Failed to adjust credits");
    }
    setIsSubmitting(false);
  };

  const handleStatusChange = async (newStatus: string, reason: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          status: newStatus,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User ${newStatus === "active" ? "reinstated" : newStatus} successfully`);
        setBanDialogOpen(false);
        setBanReason("");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
    setIsSubmitting(false);
  };

  const initials = user.display_name?.slice(0, 2) || user.username.slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Details</h1>
          <p className="text-muted-foreground">View and manage user account</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">{initials.toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{user.display_name || user.username}</h2>
                <p className="text-muted-foreground">@{user.username}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className={roleColors[user.role]}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role}
                  </Badge>
                  <Badge variant="outline" className={statusColors[user.status]}>
                    {user.status}
                  </Badge>
                </div>
                {user.ban_reason && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-left w-full">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      Ban Reason
                    </div>
                    <p className="text-sm mt-1">{user.ban_reason}</p>
                    {user.ban_expires_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {format(new Date(user.ban_expires_at), "PPp")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credits</span>
                <span className="font-mono font-medium">{user.credit_balance?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Listings</span>
                <span className="font-medium">{user.listings_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Downloads</span>
                <span className="font-medium">{user.downloads_count || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-sm">{format(new Date(user.created_at), "PP")}</span>
              </div>
              {user.verified && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Verified</span>
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => setCreditDialogOpen(true)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Adjust Credits
              </Button>
              {user.status === "active" ? (
                <>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => {
                      setBanDuration("temporary");
                      setBanDialogOpen(true);
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Suspend User
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="destructive"
                    onClick={() => {
                      setBanDuration("permanent");
                      setBanDialogOpen(true);
                    }}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Ban User
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full justify-start"
                  variant="default"
                  onClick={() => handleStatusChange("active", "User reinstated")}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reinstate User
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList>
              <TabsTrigger value="transactions">
                <CreditCard className="w-4 h-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="listings">
                <FileText className="w-4 h-4 mr-2" />
                Listings ({user.listings_count || 0})
              </TabsTrigger>
              <TabsTrigger value="activity">
                <History className="w-4 h-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {transactions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No transactions found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => {
                        const Icon = transactionIcons[tx.type] || CreditCard;
                        return (
                          <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className={`p-2 rounded-lg ${
                              tx.amount > 0 ? "bg-emerald-500/10" : "bg-destructive/10"
                            }`}>
                              <Icon className={`w-4 h-4 ${
                                tx.amount > 0 ? "text-emerald-500" : "text-destructive"
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{tx.type.replace("_", " ")}</div>
                              {tx.note && (
                                <div className="text-xs text-muted-foreground">{tx.note}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className={`font-mono font-medium ${
                                tx.amount > 0 ? "text-emerald-500" : "text-destructive"
                              }`}>
                                {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "PPp")}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="listings" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {listings.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No listings found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {listings.map((listing) => (
                        <Link
                          key={listing.id}
                          href={`/admin/resources/${listing.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-muted">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{listing.title}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {listing.status}
                              </Badge>
                              {listing.moderation_status !== "approved" && (
                                <Badge variant="destructive" className="text-xs">
                                  {listing.moderation_status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {logs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No activity logs found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="p-2 rounded-lg bg-muted">
                            <History className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {ACTION_LABELS[log.action_type] || log.action_type}
                            </div>
                            {log.note && (
                              <div className="text-xs text-muted-foreground">{log.note}</div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
            <DialogDescription>
              Manually add or deduct credits from this user&apos;s wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={creditType}
                onValueChange={(v) => setCreditType(v as "admin_adjust" | "refund")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_adjust">Manual Adjustment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex gap-2">
                <Button
                  variant={creditAmount.startsWith("-") ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreditAmount("-")}
                  disabled={creditAmount === "-"}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
                <Button
                  variant={creditAmount && !creditAmount.startsWith("-") ? "default" : "outline"}
                  size="sm"
                  onClick={() => creditAmount && setCreditAmount(creditAmount)}
                  disabled={!creditAmount || creditAmount.startsWith("-")}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Enter reason for this adjustment..."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <div className="text-muted-foreground mb-1">Current Balance</div>
              <div className="font-mono font-medium">{user.credit_balance?.toFixed(2) || "0.00"}</div>
              {creditAmount && !isNaN(parseFloat(creditAmount)) && (
                <>
                  <div className="text-muted-foreground mb-1 mt-2">New Balance</div>
                  <div className="font-mono font-medium text-emerald-500">
                    {(user.credit_balance || 0) + parseFloat(creditAmount) > 0 
                      ? ((user.credit_balance || 0) + parseFloat(creditAmount)).toFixed(2)
                      : "Insufficient balance"}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreditAdjustment} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Apply Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banDuration === "permanent" ? "Ban User" : "Suspend User"}
            </DialogTitle>
            <DialogDescription>
              {banDuration === "permanent"
                ? "This will permanently ban the user from the platform"
                : "This will temporarily suspend the user's account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={banDuration}
                onValueChange={setBanDuration}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary Suspension</SelectItem>
                  <SelectItem value="permanent">Permanent Ban</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Enter reason for this action..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={banDuration === "permanent" ? "destructive" : "default"}
              onClick={() => handleStatusChange(
                banDuration === "permanent" ? "banned" : "suspended",
                banReason
              )}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : banDuration === "permanent" ? "Ban User" : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
