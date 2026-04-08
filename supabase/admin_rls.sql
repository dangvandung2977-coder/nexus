-- ═══════════════════════════════════════════════════════
-- ADMIN DASHBOARD — RLS POLICIES
-- Run AFTER admin_dashboard.sql migration
-- ═══════════════════════════════════════════════════════

-- Enable RLS on new tables
alter table public.app_settings enable row level security;
alter table public.admin_audit_logs enable row level security;

-- ─── APP SETTINGS ───────────────────────────────────────
-- Drop existing policies first (make idempotent)
drop policy if exists "Admins can view app settings" on public.app_settings;
drop policy if exists "Admins can update app settings" on public.app_settings;

-- Admins can read all settings
create policy "Admins can view app settings"
  on public.app_settings for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- Only admins can modify settings
create policy "Admins can update app settings"
  on public.app_settings for update
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── ADMIN AUDIT LOGS ───────────────────────────────────
-- Drop existing policies first
drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
drop policy if exists "System can insert audit logs" on public.admin_audit_logs;

-- Admins can view all audit logs
create policy "Admins can view audit logs"
  on public.admin_audit_logs for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- Audit logs are insert-only (created by system, never modified)
create policy "System can insert audit logs"
  on public.admin_audit_logs for insert
  with check (admin_user_id = auth.uid());

-- ─── UPDATED PROFILES POLICIES ──────────────────────────
-- Drop existing admin-related policies if any
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Moderators can view all profiles" on public.profiles;

-- Admins and moderators can view all profiles
create policy "Staff can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- Admins can update any profile
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── UPDATED LISTINGS POLICIES ──────────────────────────
-- Drop existing staff-related policies if any
drop policy if exists "Staff can view all listings" on public.listings;
drop policy if exists "Staff can update any listing" on public.listings;

-- Staff can view all listings including hidden ones
create policy "Staff can view all listings"
  on public.listings for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or status = 'published'
    or creator_id = auth.uid()
  );

-- Staff can update any listing (for moderation)
create policy "Staff can update any listing"
  on public.listings for update
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or creator_id = auth.uid()
  );

-- ─── UPDATED REPORTS POLICIES ───────────────────────────
drop policy if exists "Staff can view all reports" on public.reports;

-- Staff can view all reports
create policy "Staff can view all reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or auth.uid() = reporter_id
  );

-- Staff can update reports (moderate)
create policy "Staff can update reports"
  on public.reports for update
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
  );

-- ─── UPDATED CREDIT WALLETS POLICIES ────────────────────
drop policy if exists "Staff can view all wallets" on public.credit_wallets;

-- Staff can view all wallets
create policy "Staff can view all wallets"
  on public.credit_wallets for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or user_id = auth.uid()
  );

-- ─── UPDATED CREDIT TRANSACTIONS POLICIES ───────────────
drop policy if exists "Staff can view all transactions" on public.credit_transactions;

-- Staff can view all transactions
create policy "Staff can view all transactions"
  on public.credit_transactions for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or user_id = auth.uid()
  );

-- ─── UPDATED DAILY CHECKINS POLICIES ───────────────────
drop policy if exists "Staff can view all checkins" on public.daily_checkins;

-- Staff can view all checkins
create policy "Staff can view all checkins"
  on public.daily_checkins for select
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role in ('admin', 'moderator')
    )
    or user_id = auth.uid()
  );
