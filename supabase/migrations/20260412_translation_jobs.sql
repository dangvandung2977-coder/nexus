-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — TRANSLATION JOBS MIGRATION
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Translation Jobs table
CREATE TABLE IF NOT EXISTS public.translation_jobs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  source_language     text NOT NULL DEFAULT 'en',
  target_language     text NOT NULL DEFAULT 'vi',
  input_file_path     text NOT NULL,
  output_file_path    text,
  original_filename   text NOT NULL,
  translated_filename text,
  credit_cost         numeric(10,2) NOT NULL DEFAULT 0,
  translatable_line_count integer NOT NULL DEFAULT 0,
  translated_line_count   integer NOT NULL DEFAULT 0,
  file_size           bigint NOT NULL DEFAULT 0,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS translation_jobs_user_idx ON public.translation_jobs(user_id);
CREATE INDEX IF NOT EXISTS translation_jobs_status_idx ON public.translation_jobs(status);
CREATE INDEX IF NOT EXISTS translation_jobs_created_idx ON public.translation_jobs(created_at DESC);

-- Drop existing trigger if re-running (make idempotent)
DROP TRIGGER IF EXISTS translation_jobs_updated_at ON public.translation_jobs;
CREATE TRIGGER translation_jobs_updated_at BEFORE UPDATE ON public.translation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (make idempotent)
DROP POLICY IF EXISTS "Users read own translation jobs" ON public.translation_jobs;
DROP POLICY IF EXISTS "Users insert own translation jobs" ON public.translation_jobs;
DROP POLICY IF EXISTS "Users delete own translation jobs" ON public.translation_jobs;

-- Users can only read their own translation jobs
CREATE POLICY "Users read own translation jobs"
  ON public.translation_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own translation jobs
CREATE POLICY "Users insert own translation jobs"
  ON public.translation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own translation jobs
CREATE POLICY "Users delete own translation jobs"
  ON public.translation_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for translation files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('translations', 'translations', false, 10485760, ARRAY['application/x-yaml', 'application/json', 'text/plain', 'application/zip', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- RLS for translation storage
DROP POLICY IF EXISTS "Users can upload translation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own translation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own translation files" ON storage.objects;

CREATE POLICY "Users can upload translation files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'translations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own translation files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'translations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own translation files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'translations' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );