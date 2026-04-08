import { getDashboardStats, getRecentActivity } from "@/actions/admin/dashboard";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Ban,
  Clock,
  Plus,
  Minus,
  Settings,
  Eye,
  Trash2,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ACTION_LABELS } from "@/lib/admin/audit";
import Link from "next/link";

async function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-500">+{trend.value}%</span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "credit_adjust":
      return Minus;
    case "refund":
      return Plus;
    case "user_ban":
    case "user_suspend":
      return Ban;
    case "user_unban":
    case "user_unsuspend":
      return CheckCircle;
    case "role_change":
      return Shield;
    case "listing_hide":
      return Eye;
    case "listing_delete":
    case "listing_restore":
      return Trash2;
    case "settings_change":
      return Settings;
    default:
      return Clock;
  }
}

export default async function AdminDashboardPage() {
  const [stats, activity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);

  if (!stats || !activity) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Unable to load dashboard data
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of platform activity and management tools
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.users.total}
          description={`${stats.users.active} active`}
          icon={Users}
        />
        <StatCard
          title="Resources"
          value={stats.listings.total}
          description={`${stats.listings.published} published`}
          icon={FileText}
        />
        <StatCard
          title="Credits in Circulation"
          value={stats.credits.totalInCirculation.toLocaleString()}
          description={`${stats.credits.totalTransactions.toLocaleString()} transactions`}
          icon={CreditCard}
        />
        <StatCard
          title="Pending Reports"
          value={stats.activity.pendingReports}
          description="Require moderation"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Banned Users"
          value={stats.users.banned}
          icon={Ban}
        />
        <StatCard
          title="Suspended Users"
          value={stats.users.suspended}
          icon={Clock}
        />
        <StatCard
          title="Hidden Resources"
          value={stats.listings.hidden}
          icon={Eye}
        />
        <StatCard
          title="Today's Check-ins"
          value={stats.activity.todayCheckins}
          icon={CheckCircle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Actions</CardTitle>
            <CardDescription>
              Latest moderation and administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.auditLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent admin actions
              </div>
            ) : (
              <div className="space-y-4">
                {activity.auditLogs.slice(0, 8).map((log) => {
                  const Icon = getActionIcon(log.action_type);
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {ACTION_LABELS[log.action_type] || log.action_type}
                          </span>
                          {log.target_name && (
                            <Badge variant="secondary" className="text-xs">
                              {log.target_name}
                            </Badge>
                          )}
                        </div>
                        {log.note && (
                          <p className="text-xs text-muted-foreground truncate">
                            {log.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Users</CardTitle>
            <CardDescription>
              Recently registered accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.newUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No new users yet
              </div>
            ) : (
              <div className="space-y-4">
                {activity.newUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{(user.username[0] || "?").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Resources</CardTitle>
            <CardDescription>
              Latest listings on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.recentListings.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent listings
              </div>
            ) : (
              <div className="space-y-4">
                {activity.recentListings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/admin/resources/${listing.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">
                        by @{listing.creator.username}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/admin/users"
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Manage Users</span>
              </Link>
              <Link
                href="/admin/credits"
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Credit System</span>
              </Link>
              <Link
                href="/admin/resources"
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Moderate Content</span>
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Platform Settings</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
