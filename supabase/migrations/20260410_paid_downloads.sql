-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — PAID DOWNLOADS MIGRATION
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Add credit_cost column to listings (default 0 for free downloads)
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS credit_cost numeric(10,2) NOT NULL DEFAULT 0 CHECK (credit_cost >= 0);

-- Create index on credit_cost for potential filtering
CREATE INDEX IF NOT EXISTS listings_credit_cost_idx ON public.listings(credit_cost);

-- Update downloads table to track credit cost paid (if needed for refunds/auditing)
-- Note: downloads table already exists, we just need to track credit_cost
ALTER TABLE public.downloads
  ADD COLUMN IF NOT EXISTS credit_cost numeric(10,2) NOT NULL DEFAULT 0;

-- RLS: downloads table already has policies, but let's ensure users can only see their own downloads
-- This is already in place based on the existing schema