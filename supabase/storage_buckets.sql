-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — STORAGE BUCKETS SETUP
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Create the 'avatars' bucket (public, so URLs work without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                          -- public access for avatar URLs
  5242880,                       -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Create the 'listings' bucket (for cover images, screenshots)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listings',
  'listings',
  true,
  10485760,                      -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create the 'listing-files' bucket (for downloadable files, private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'listing-files',
  'listing-files',
  false,                         -- private: only accessible via signed URLs
  104857600                      -- 100MB limit
)
ON CONFLICT (id) DO NOTHING;

-- ─── STORAGE RLS POLICIES ────────────────────────────────

-- AVATARS: anyone can read, only owner can write
DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- LISTINGS: public read, listing owner can write
DROP POLICY IF EXISTS "Listing images are publicly readable" ON storage.objects;
CREATE POLICY "Listing images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can update listing images" ON storage.objects;
CREATE POLICY "Authenticated users can update listing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listings'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can delete listing images" ON storage.objects;
CREATE POLICY "Authenticated users can delete listing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- LISTING FILES: authenticated users can upload; owners can read via signed URL
DROP POLICY IF EXISTS "Authenticated users can upload listing files" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-files'
    AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Authenticated users can read listing files" ON storage.objects;
CREATE POLICY "Authenticated users can read listing files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'listing-files'
    AND auth.uid() IS NOT NULL
  );
