# Admin Dashboard Integration Guide

## Overview

This document describes the admin dashboard implementation added to the Nexus Market platform. The admin dashboard provides comprehensive tools for managing users, credits, content moderation, and platform settings.

## Files Created/Modified

### Database Migrations
- `supabase/migrations/20260420_admin_dashboard.sql` - Core admin tables and functions
- `supabase/admin_rls.sql` - RLS policies for admin tables

### Types
- `src/types/database.types.ts` - Updated with new table types

### Library Helpers (`src/lib/admin/`)
- `auth.ts` - Admin authentication and authorization helpers
- `settings.ts` - Platform settings management
- `audit.ts` - Audit logging functionality
- `index.ts` - Barrel export

### Server Actions (`src/actions/admin/`)
- `dashboard.ts` - Dashboard overview data
- `users.ts` - User management actions
- `credits.ts` - Credit system management
- `listings.ts` - Content moderation actions
- `settings.ts` - Settings management actions
- `index.ts` - Barrel export

### API Routes (`src/app/api/admin/`)
- `credits/adjust/route.ts` - Credit adjustment endpoint
- `users/status/route.ts` - User status management
- `resources/moderation/route.ts` - Content moderation
- `resources/delete/route.ts` - Content deletion
- `resources/restore/route.ts` - Content restoration
- `settings/route.ts` - Settings update endpoint

### Components (`src/components/admin/`)
- `AdminSidebar.tsx` - Admin navigation sidebar
- `AdminHeader.tsx` - Admin top header
- `AdminUsersClient.tsx` - User list client component
- `AdminUserDetailClient.tsx` - User detail client component
- `AdminCreditsClient.tsx` - Credits management client
- `AdminResourcesClient.tsx` - Resources list client
- `AdminResourceDetailClient.tsx` - Resource detail client
- `AdminSettingsClient.tsx` - Settings client component

### Pages (`src/app/admin/`)
- `layout.tsx` - Admin layout wrapper
- `page.tsx` - Dashboard overview
- `users/page.tsx` - User list page
- `users/[id]/page.tsx` - User detail page
- `credits/page.tsx` - Credits management page
- `resources/page.tsx` - Content moderation page
- `resources/[id]/page.tsx` - Resource detail page
- `settings/page.tsx` - Platform settings page

### Middleware
- `src/middleware.ts` - Updated to protect `/admin` routes

### Existing Files Updated
- `src/actions/checkin.ts` - Now reads reward settings from database
- `src/actions/translations.ts` - Now uses async credit calculation
- `src/lib/translation.ts` - Reads pricing from database settings

---

## Database Schema

### New Tables

#### `profiles` - Updated with ban fields
```sql
status          text default 'active' check (status in ('active','suspended','banned'))
ban_reason      text
ban_expires_at  timestamptz
banned_by       uuid references profiles(id)
banned_at       timestamptz
```

#### `listings` - Updated with moderation fields
```sql
moderation_status   text default 'approved' check (...)
moderation_reason   text
moderated_by        uuid references profiles(id)
moderated_at       timestamptz
```

#### `app_settings`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| key | text | Unique setting key |
| value | jsonb | Setting value |
| value_type | text | Type: string/number/boolean/json |
| description | text | Human-readable description |
| category | text | rewards/economy/translation/moderation/general |
| updated_by | uuid | Admin who last modified |

#### `admin_audit_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| admin_user_id | uuid | Admin who performed action |
| action_type | text | Action type enum |
| target_type | text | user/listing/comment/settings/report |
| target_id | uuid | Affected entity ID |
| target_name | text | Human-readable target name |
| note | text | Admin-provided reason |
| metadata | jsonb | Additional context |
| created_at | timestamptz | Timestamp |

---

## Default Settings

The migration inserts these default settings:

### Rewards Settings
| Key | Default | Description |
|-----|---------|-------------|
| daily_checkin_base_credit | 5 | Base credits per day |
| streak_enabled | true | Enable streak bonuses |
| streak_bonus_credit | 1 | Bonus per streak day |
| streak_milestone_3 | 5 | Day 3 bonus |
| streak_milestone_7 | 15 | Day 7 bonus |
| streak_milestone_14 | 30 | Day 14 bonus |
| streak_milestone_30 | 50 | Day 30 bonus |
| max_daily_reward_cap | 0 | 0 = unlimited |

### Translation Settings
| Key | Default | Description |
|-----|---------|-------------|
| translation_credits_per_line | 0.5 | Cost per line |
| translation_min_charge | 1 | Minimum charge |
| translation_max_free_lines | 50 | Free lines |

### Economy Settings
| Key | Default | Description |
|-----|---------|-------------|
| download_credit_enabled | false | Enable credit downloads |
| download_default_credit_cost | 10 | Default download cost |

---

## Admin Access Control

### How It Works

1. **Middleware Protection**: All `/admin/*` routes require authentication
2. **Layout Check**: `AdminLayout` component calls `checkAdminAccess()`
3. **RLS Policies**: Database enforces role-based access

### Role Hierarchy
```
admin > moderator > creator > user
```

### Permission Matrix

| Action | Admin | Moderator | User |
|--------|-------|-----------|------|
| View admin dashboard | ✓ | ✓ | ✗ |
| View all users | ✓ | ✓ | ✗ |
| Manage users (ban/suspend) | ✓ | ✗ | ✗ |
| Change user roles | ✓ | ✗ | ✗ |
| View all credits | ✓ | ✓ | ✗ |
| Adjust credits | ✓ | ✗ | ✗ |
| Moderate content | ✓ | ✓ | ✗ |
| Delete content | ✓ | ✓ | ✗ |
| View audit logs | ✓ | ✓ | ✗ |
| Change settings | ✓ | ✗ | ✗ |

### Admin Check Function

```typescript
// src/lib/admin/auth.ts
import { checkAdminAccess, requireAdmin } from "@/lib/admin/auth";

// In server components/actions:
const admin = await checkAdminAccess();
if (!admin.user || !admin.isStaff) {
  return { error: "Unauthorized" };
}

// For protected actions:
const adminUser = await requireAdmin();
```

---

## Audit Logging

### Logged Actions

All admin actions are logged to `admin_audit_logs`:

| Action Type | Description |
|-------------|-------------|
| credit_adjust | Manual credit changes |
| refund | Credit refunds |
| user_ban | Permanent ban |
| user_suspend | Temporary suspension |
| user_unban | Ban/suspension lifted |
| user_unsuspend | Suspension lifted |
| role_change | Role promotion/demotion |
| listing_hide | Content hidden |
| listing_unhide | Content unhidden |
| listing_delete | Content deleted |
| listing_restore | Content restored |
| settings_change | Settings modified |
| report_dismiss | Report dismissed |
| report_action | Report action taken |

### Using Audit Logs

```typescript
import { createAuditLog, getAuditLogs } from "@/lib/admin/audit";

// Log an action
await createAuditLog({
  adminId: admin.id,
  actionType: "credit_adjust",
  targetType: "user",
  targetId: userId,
  note: "Customer support refund",
  metadata: { amount: 100 }
});

// Get logs for a user
const logs = await getAuditLogsForUser(userId);
```

---

## Testing Manual

### Prerequisites
1. Deploy the database migration
2. Apply RLS policies
3. Create an admin user (set role = 'admin' in profiles table)

### Test Scenarios

#### 1. Admin Dashboard Access
- [ ] Navigate to `/admin` - should show dashboard
- [ ] Non-admin users redirected to `/dashboard`
- [ ] Unauthenticated users redirected to `/login`

#### 2. User Management
- [ ] List users with pagination
- [ ] Search users by username
- [ ] Filter by role (admin/moderator/creator/user)
- [ ] Filter by status (active/suspended/banned)
- [ ] View user details
- [ ] Check credit balance
- [ ] View transaction history
- [ ] View listing history
- [ ] View audit logs

#### 3. Credit Management
- [ ] Add credits to user
- [ ] Deduct credits from user
- [ ] Verify balance cannot go negative
- [ ] Verify transaction appears in history
- [ ] Verify audit log entry created

#### 4. Ban/Suspend System
- [ ] Suspend a user (temporary)
- [ ] Ban a user (permanent)
- [ ] Reinstate a banned/suspended user
- [ ] Verify status badges update
- [ ] Verify ban reason displays

#### 5. Content Moderation
- [ ] List all resources (including hidden)
- [ ] Filter by status (draft/published/archived/flagged)
- [ ] Filter by moderation status
- [ ] Hide a resource
- [ ] Unhide a resource
- [ ] Delete a resource
- [ ] Restore a deleted resource
- [ ] Add moderation reason

#### 6. Platform Settings
- [ ] View reward settings
- [ ] Change daily check-in base credit
- [ ] Enable/disable streaks
- [ ] Configure streak milestones
- [ ] Set daily reward cap
- [ ] View translation pricing
- [ ] Change translation credit rate
- [ ] Set minimum translation charge
- [ ] Verify changes reflect in app

#### 7. Audit Trail
- [ ] View recent admin actions on dashboard
- [ ] View actions for specific user
- [ ] View actions for specific resource
- [ ] Verify all actions are logged

---

## Deployment Checklist

1. **Database Migration**
   ```bash
   # Run in Supabase SQL Editor or via CLI
   cat supabase/migrations/20260420_admin_dashboard.sql | supabase db execute
   ```

2. **Apply RLS Policies**
   ```bash
   cat supabase/admin_rls.sql | supabase db execute
   ```

3. **Create Admin User**
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
   ```

4. **Verify Environment**
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` set
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
   - [ ] Service role key available for admin client

5. **Test in Staging**
   - Test all admin flows before production deployment

---

## Security Considerations

1. **Never Trust Client-Side Checks**: All permission checks happen server-side
2. **Audit Everything**: All sensitive actions are logged
3. **RLS Defense**: Multiple layers of protection (middleware + layout + RLS)
4. **No Silent Changes**: Every credit change requires a reason
5. **Revocable Access**: Bans can be lifted, data can be restored

---

## Future Enhancements

- [ ] Bulk user actions (bulk ban, bulk role change)
- [ ] Scheduled actions (auto-unban after expiry)
- [ ] Two-factor confirmation for destructive actions
- [ ] Export audit logs to CSV
- [ ] Email notification on user ban
- [ ] API rate limiting for admin endpoints
- [ ] Moderation queue with assignment
- [ ] Content version history with rollback
