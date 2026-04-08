-- ═══════════════════════════════════════════════════════
-- ADMIN DASHBOARD — DATABASE MIGRATION
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── USER STATUS FIELD ──────────────────────────────────
-- Add status field for ban/suspend system
alter table public.profiles add column if not exists status text not null default 'active' 
  check (status in ('active', 'suspended', 'banned'));
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists ban_expires_at timestamptz;
alter table public.profiles add column if not exists banned_by uuid references public.profiles(id);
alter table public.profiles add column if not exists banned_at timestamptz;

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);

-- ─── LISTING MODERATION FIELDS ─────────────────────────
alter table public.listings add column if not exists moderation_status text not null default 'approved' 
  check (moderation_status in ('approved', 'pending_review', 'hidden', 'removed'));
alter table public.listings add column if not exists moderation_reason text;
alter table public.listings add column if not exists moderated_by uuid references public.profiles(id);
alter table public.listings add column if not exists moderated_at timestamptz;

create index if not exists listings_moderation_status_idx on public.listings(moderation_status);

-- ─── APP SETTINGS TABLE ─────────────────────────────────
create table if not exists public.app_settings (
  id            uuid primary key default uuid_generate_v4(),
  key           text not null unique,
  value         jsonb not null,
  value_type    text not null check (value_type in ('string', 'number', 'boolean', 'json')),
  description   text,
  category      text not null default 'general' check (category in ('rewards', 'economy', 'translation', 'moderation', 'general')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id)
);

create index if not exists app_settings_key_idx on public.app_settings(key);
create index if not exists app_settings_category_idx on public.app_settings(category);

-- Insert default settings
insert into public.app_settings (key, value, value_type, description, category) values
  ('daily_checkin_base_credit', '5', 'number', 'Base credits awarded for daily check-in', 'rewards'),
  ('streak_enabled', 'true', 'boolean', 'Enable streak bonus for consecutive check-ins', 'rewards'),
  ('streak_bonus_credit', '1', 'number', 'Additional credits per streak day', 'rewards'),
  ('streak_milestone_3', '5', 'number', 'Bonus credits at 3-day streak', 'rewards'),
  ('streak_milestone_7', '15', 'number', 'Bonus credits at 7-day streak', 'rewards'),
  ('streak_milestone_14', '30', 'number', 'Bonus credits at 14-day streak', 'rewards'),
  ('streak_milestone_30', '50', 'number', 'Bonus credits at 30-day streak', 'rewards'),
  ('translation_credits_per_line', '0.5', 'number', 'Credits charged per line of translation', 'translation'),
  ('translation_min_charge', '1', 'number', 'Minimum credits charged for any translation job', 'translation'),
  ('translation_max_free_lines', '50', 'number', 'Free lines before credits are charged', 'translation'),
  ('download_credit_enabled', 'false', 'boolean', 'Enable credit-based downloads', 'economy'),
  ('download_default_credit_cost', '10', 'number', 'Default credit cost for downloads', 'economy'),
  ('max_daily_reward_cap', '100', 'number', 'Maximum daily reward credits (0 = unlimited)', 'rewards')
on conflict (key) do nothing;

-- ─── ADMIN AUDIT LOGS TABLE ─────────────────────────────
create table if not exists public.admin_audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  admin_user_id   uuid not null references public.profiles(id),
  action_type     text not null check (action_type in (
    'credit_adjust', 'refund', 'user_ban', 'user_unban', 'user_suspend', 'user_unsuspend',
    'role_change', 'listing_hide', 'listing_unhide', 'listing_delete', 'listing_restore',
    'settings_change', 'report_dismiss', 'report_action'
  )),
  target_type     text not null check (target_type in ('user', 'listing', 'comment', 'settings', 'report')),
  target_id       uuid,
  target_name     text,
  note            text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs(admin_user_id);
create index if not exists admin_audit_logs_action_idx on public.admin_audit_logs(action_type);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs(target_type, target_id);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

-- ─── UPDATED RPC: adjust_credits (with admin_id support) ─
create or replace function public.adjust_credits(
  p_user_id uuid,
  p_amount numeric,
  p_type text,
  p_note text default null,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_wallet_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_new_balance numeric;
begin
  -- Get advisory lock for this user to prevent race conditions
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  
  -- Get or create wallet
  select id, balance into v_wallet_id, v_balance_before
  from public.credit_wallets
  where user_id = p_user_id
  for update;
  
  if v_wallet_id is null then
    insert into public.credit_wallets (user_id, balance)
    values (p_user_id, 0)
    returning id into v_wallet_id;
    v_balance_before := 0;
  end if;
  
  -- Validate sufficient balance for debits
  if p_amount < 0 and (v_balance_before + p_amount) < 0 then
    return jsonb_build_object('error', 'Insufficient balance');
  end if;
  
  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;
  
  -- Update wallet
  update public.credit_wallets
  set balance = v_balance_after, updated_at = now()
  where id = v_wallet_id;
  
  -- Record transaction
  insert into public.credit_transactions (
    user_id, wallet_id, type, amount, balance_before, balance_after,
    ref_type, ref_id, note
  ) values (
    p_user_id, v_wallet_id, p_type, p_amount, v_balance_before, v_balance_after,
    p_ref_type, p_ref_id, p_note
  );
  
  -- Log admin action if admin_id provided
  if p_admin_id is not null then
    insert into public.admin_audit_logs (admin_user_id, action_type, target_type, target_id, note, metadata)
    values (
      p_admin_id,
      case p_type 
        when 'refund' then 'refund'
        else 'credit_adjust'
      end,
      'user',
      p_user_id,
      p_note,
      jsonb_build_object(
        'amount', p_amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'transaction_type', p_type
      )
    );
  end if;
  
  return jsonb_build_object('balance', v_balance_after);
end;
$$;

-- ─── UPDATED RPC: claim_daily_reward (with settings) ────
create or replace function public.claim_daily_reward(p_user_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_today date := current_date;
  v_yesterday date := current_date - interval '1 day';
  v_last_checkin date;
  v_streak integer := 0;
  v_reward numeric;
  v_bonus numeric := 0;
  v_total numeric := 0;
  v_streak_enabled boolean;
  v_streak_bonus numeric;
  v_milestone_3 numeric;
  v_milestone_7 numeric;
  v_milestone_14 numeric;
  v_milestone_30 numeric;
  v_max_cap numeric;
  v_new_balance numeric;
begin
  -- Check if already claimed today
  if exists (
    select 1 from public.daily_checkins 
    where user_id = p_user_id and checkin_date = v_today
  ) then
    return jsonb_build_object('error', 'already_claimed');
  end if;
  
  -- Get settings
  select 
    (value->>0)::boolean,
    (value->>0)::numeric,
    (select value::numeric from public.app_settings where key = 'streak_milestone_3'),
    (select value::numeric from public.app_settings where key = 'streak_milestone_7'),
    (select value::numeric from public.app_settings where key = 'streak_milestone_14'),
    (select value::numeric from public.app_settings where key = 'streak_milestone_30'),
    (select value::numeric from public.app_settings where key = 'max_daily_reward_cap')
  into v_streak_enabled, v_streak_bonus, v_milestone_3, v_milestone_7, v_milestone_14, v_milestone_30, v_max_cap
  from public.app_settings
  where key in ('streak_enabled', 'streak_bonus_credit')
  limit 1;
  
  -- Default values if settings not found
  v_streak_enabled := coalesce(v_streak_enabled, true);
  v_streak_bonus := coalesce(v_streak_bonus, 1);
  v_milestone_3 := coalesce(v_milestone_3, 5);
  v_milestone_7 := coalesce(v_milestone_7, 15);
  v_milestone_14 := coalesce(v_milestone_14, 30);
  v_milestone_30 := coalesce(v_milestone_30, 50);
  v_max_cap := coalesce(v_max_cap, 0);
  
  -- Get base reward from settings
  select (value->>0)::numeric into v_reward from public.app_settings where key = 'daily_checkin_base_credit';
  v_reward := coalesce(v_reward, 5);
  
  -- Calculate streak
  select checkin_date into v_last_checkin
  from public.daily_checkins
  where user_id = p_user_id
  order by checkin_date desc
  limit 1;
  
  if v_last_checkin = v_yesterday then
    select streak into v_streak from public.daily_checkins 
    where user_id = p_user_id order by checkin_date desc limit 1;
    v_streak := v_streak + 1;
  elsif v_last_checkin = v_today then
    return jsonb_build_object('error', 'already_claimed');
  else
    v_streak := 1;
  end if;
  
  -- Calculate bonuses
  v_bonus := v_streak_bonus * (v_streak - 1);
  
  if v_streak >= 30 then
    v_bonus := v_bonus + v_milestone_30;
  elsif v_streak >= 14 then
    v_bonus := v_bonus + v_milestone_14;
  elsif v_streak >= 7 then
    v_bonus := v_bonus + v_milestone_7;
  elsif v_streak >= 3 then
    v_bonus := v_bonus + v_milestone_3;
  end if;
  
  v_total := v_reward + v_bonus;
  
  -- Apply cap if set
  if v_max_cap > 0 and v_total > v_max_cap then
    v_total := v_max_cap;
  end if;
  
  -- Record checkin
  insert into public.daily_checkins (user_id, checkin_date, reward_amount, streak)
  values (p_user_id, v_today, v_total, v_streak);
  
  -- Adjust credits
  select (adjust_credits(p_user_id, v_total, 'daily_reward', 
    'Daily check-in: ' || v_total || ' credits (base: ' || v_reward || ', streak: ' || v_streak || ')'
  )->>'balance')::numeric into v_new_balance
  from public.credit_wallets where user_id = p_user_id;
  
  return jsonb_build_object(
    'claimed', true,
    'reward', v_total,
    'streak', v_streak,
    'balance', v_new_balance
  );
end;
$$;

-- ─── HELPER: get_setting ────────────────────────────────
create or replace function public.get_setting(p_key text)
returns jsonb
language plpgsql security definer
as $$
begin
  return (
    select jsonb_build_object('value', value, 'value_type', value_type)
    from public.app_settings
    where key = p_key
  );
end;
$$;

-- ─── HELPER: get_all_settings ───────────────────────────
create or replace function public.get_all_settings(p_category text default null)
returns table(key text, value jsonb, value_type text, description text, category text)
language plpgsql security definer
as $$
begin
  return query
  select s.key, s.value, s.value_type, s.description, s.category
  from public.app_settings s
  where p_category is null or s.category = p_category;
end;
$$;
