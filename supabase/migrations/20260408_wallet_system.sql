-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — WALLET & CREDIT SYSTEM MIGRATION
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Fix listings table: ensure all optional columns exist
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS supported_versions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_open_source boolean NOT NULL DEFAULT false;

-- ─── CREDIT WALLETS ──────────────────────────────────────
-- One wallet per user, stores running balance
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance     numeric(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_wallets_user_idx ON public.credit_wallets(user_id);

CREATE TRIGGER credit_wallets_updated_at BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── CREDIT TRANSACTIONS ─────────────────────────────────
-- Immutable audit log; never delete rows, only insert
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id      uuid NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN (
                   'daily_reward',
                   'download_cost',
                   'translation_cost',
                   'admin_adjust',
                   'refund'
                 )),
  amount         numeric(10,2) NOT NULL,          -- positive = credit, negative = debit
  balance_before numeric(10,2) NOT NULL,
  balance_after  numeric(10,2) NOT NULL,
  ref_type       text,                             -- e.g. 'listing', 'translation_job'
  ref_id         uuid,                             -- linked resource id
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_tx_user_idx    ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_tx_wallet_idx  ON public.credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS credit_tx_created_idx ON public.credit_transactions(created_at DESC);

-- ─── DAILY CHECK-INS ─────────────────────────────────────
-- One row per (user, date) — unique constraint prevents duplicate claims
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin_date  date NOT NULL DEFAULT CURRENT_DATE,
  reward_amount numeric(10,2) NOT NULL DEFAULT 5,
  streak        integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS daily_checkins_user_idx ON public.daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS daily_checkins_date_idx ON public.daily_checkins(user_id, checkin_date);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────
ALTER TABLE public.credit_wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins      ENABLE ROW LEVEL SECURITY;

-- Wallets: users can only read their own wallet
CREATE POLICY "Users read own wallet"
  ON public.credit_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Transactions: users can only read their own history
CREATE POLICY "Users read own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Check-ins: users can only read their own records
CREATE POLICY "Users read own checkins"
  ON public.daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

-- ─── HELPER: Safe credit adjustment RPC ──────────────────
-- Called from server-side actions only; bypasses RLS via security definer
CREATE OR REPLACE FUNCTION public.adjust_credits(
  p_user_id    uuid,
  p_amount     numeric,        -- positive to add, negative to subtract
  p_type       text,
  p_note       text DEFAULT NULL,
  p_ref_type   text DEFAULT NULL,
  p_ref_id     uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_wallet       public.credit_wallets%ROWTYPE;
  v_balance_new  numeric(10,2);
BEGIN
  -- Get or create wallet (advisory lock per user to prevent races)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.credit_wallets WHERE user_id = p_user_id FOR UPDATE;

  v_balance_new := v_wallet.balance + p_amount;

  IF v_balance_new < 0 THEN
    RETURN jsonb_build_object('error', 'Insufficient balance');
  END IF;

  -- Update wallet balance
  UPDATE public.credit_wallets
  SET balance = v_balance_new, updated_at = now()
  WHERE id = v_wallet.id;

  -- Record transaction
  INSERT INTO public.credit_transactions
    (user_id, wallet_id, type, amount, balance_before, balance_after, note, ref_type, ref_id)
  VALUES
    (p_user_id, v_wallet.id, p_type, p_amount, v_wallet.balance, v_balance_new, p_note, p_ref_type, p_ref_id);

  RETURN jsonb_build_object('balance', v_balance_new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── HELPER: Daily check-in claim RPC ────────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_today        date := CURRENT_DATE;
  v_yesterday    date := CURRENT_DATE - 1;
  v_last_checkin public.daily_checkins%ROWTYPE;
  v_streak       integer := 1;
  v_reward       numeric(10,2) := 5;
  v_result       jsonb;
BEGIN
  -- Prevent duplicate claim for today
  IF EXISTS (
    SELECT 1 FROM public.daily_checkins
    WHERE user_id = p_user_id AND checkin_date = v_today
  ) THEN
    RETURN jsonb_build_object('error', 'already_claimed', 'message', 'Already claimed today');
  END IF;

  -- Calculate streak
  SELECT * INTO v_last_checkin
  FROM public.daily_checkins
  WHERE user_id = p_user_id
  ORDER BY checkin_date DESC
  LIMIT 1;

  IF v_last_checkin.checkin_date = v_yesterday THEN
    v_streak := v_last_checkin.streak + 1;
  END IF;

  -- Record check-in (UNIQUE constraint is the safety net)
  INSERT INTO public.daily_checkins (user_id, checkin_date, reward_amount, streak)
  VALUES (p_user_id, v_today, v_reward, v_streak);

  -- Add credits via the safe adjust function
  v_result := public.adjust_credits(
    p_user_id, v_reward, 'daily_reward',
    'Daily check-in reward (day ' || v_streak || ')'
  );

  IF v_result ? 'error' THEN
    RAISE EXCEPTION 'Credit adjustment failed: %', v_result->>'error';
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'reward', v_reward,
    'streak', v_streak,
    'balance', v_result->>'balance'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
