-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — FINAL SCHEMA SYNC FIX
-- This script ensures ALL tables have ALL columns expected by the UI.
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- ─── 1. FIX LISTINGS TABLE ─────────────────────────────
-- Most common source of errors on /dashboard/listings/new
ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS short_description   text DEFAULT 'No description',
  ADD COLUMN IF NOT EXISTS external_url        text,
  ADD COLUMN IF NOT EXISTS youtube_url         text,
  ADD COLUMN IF NOT EXISTS license             text DEFAULT 'MIT',
  ADD COLUMN IF NOT EXISTS is_open_source      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS platforms           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supported_versions  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dependencies        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS popularity_score    numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count          bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS download_count      bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_count      bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured            boolean NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_cost         integer NOT NULL DEFAULT 0;

-- Update short_description default to not have 'No description' if it's new
ALTER TABLE public.listings ALTER COLUMN short_description SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN short_description SET DEFAULT '';

-- ─── 2. FIX PROFILES TABLE ──────────────────────────────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS banner_url   text,
  ADD COLUMN IF NOT EXISTS bio          text,
  ADD COLUMN IF NOT EXISTS website      text,
  ADD COLUMN IF NOT EXISTS twitter      text,
  ADD COLUMN IF NOT EXISTS github       text,
  ADD COLUMN IF NOT EXISTS discord      text,
  ADD COLUMN IF NOT EXISTS role         text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin')),
  ADD COLUMN IF NOT EXISTS verified     boolean NOT NULL DEFAULT false;

-- ─── 3. FIX LISTING FILES TABLE ─────────────────────────
ALTER TABLE public.listing_files
  ADD COLUMN IF NOT EXISTS version_id uuid REFERENCES public.listing_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS download_count bigint NOT NULL DEFAULT 0;

-- ─── 4. FIX DOWNLOADS TABLE ─────────────────────────────
ALTER TABLE public.downloads
  ADD COLUMN IF NOT EXISTS credit_cost integer NOT NULL DEFAULT 0;

-- ─── 5. UPDATE TRANSACTION TYPES ────────────────────────
-- Ensure listing_payout is a valid transaction type
DO $$ 
BEGIN
  ALTER TABLE public.credit_transactions 
    DROP CONSTRAINT IF EXISTS credit_transactions_type_check;
    
  ALTER TABLE public.credit_transactions 
    ADD CONSTRAINT credit_transactions_type_check 
    CHECK (type IN ('daily_reward', 'download_cost', 'translation_cost', 'admin_adjust', 'refund', 'listing_payout'));
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- Skip if table doesn't exist yet
END $$;

-- ─── 6. ADD DOWNLOAD INCREMENT RPC ──────────────────────
CREATE OR REPLACE FUNCTION public.increment_download_count(listing_id uuid, file_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.listings 
  SET download_count = download_count + 1 
  WHERE id = listing_id;
  
  UPDATE public.listing_files 
  SET download_count = download_count + 1 
  WHERE id = file_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 6. REFRESH SCHEMA CACHE ────────────────────────────
-- This is often the real reason columns "disappear" from PostgREST/Supabase client
NOTIFY pgrst, 'reload schema';
