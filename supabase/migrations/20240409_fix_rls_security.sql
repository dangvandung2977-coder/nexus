-- ═══════════════════════════════════════════════════════
-- SECURITY HARDENING: ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════

-- ─── 1. ENABLE RLS ON ALL TABLES ─────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ─── 2. HELPER FUNCTIONS ──────────────────────────
-- Check if user is staff (moderator or admin)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (role IN ('moderator', 'admin'))
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. PROFILES POLICIES ──────────────────────────
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 4. MARKETPLACE ASSETS (READ ONLY) ──────────────
-- Categories, Platforms, Tags are public read, admin write
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read platforms" ON public.platforms FOR SELECT USING (true);
CREATE POLICY "Admin manage platforms" ON public.platforms FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admin manage tags" ON public.tags FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 5. LISTINGS POLICIES ──────────────────────────
-- Select: Public can see approved/published. Owners/Staff see all.
CREATE POLICY "Visible listings" ON public.listings FOR SELECT 
USING (
  (status = 'published' AND moderation_status = 'approved') OR
  auth.uid() = creator_id OR
  public.is_staff()
);

CREATE POLICY "Creators can insert listings" ON public.listings FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Owners can update listings" ON public.listings FOR UPDATE 
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Staff can manage listings" ON public.listings FOR ALL 
USING (public.is_staff());

-- ─── 6. LISTING SUB-TABLES (Versions, Files, Images) ─────
-- Policies mirror the parent listing visibility
CREATE POLICY "Files visibility" ON public.listing_files FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND (
    (status = 'published' AND moderation_status = 'approved') OR
    creator_id = auth.uid() OR
    public.is_staff()
  ))
);

CREATE POLICY "Images visibility" ON public.listing_images FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND (
    (status = 'published' AND moderation_status = 'approved') OR
    creator_id = auth.uid() OR
    public.is_staff()
  ))
);

CREATE POLICY "Versions visibility" ON public.listing_versions FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND (
    (status = 'published' AND moderation_status = 'approved') OR
    creator_id = auth.uid() OR
    public.is_staff()
  ))
);

-- Management for sub-tables
CREATE POLICY "Creators manage versions" ON public.listing_versions FOR ALL USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND creator_id = auth.uid()));
CREATE POLICY "Creators manage files" ON public.listing_files FOR ALL USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND creator_id = auth.uid()));
CREATE POLICY "Creators manage images" ON public.listing_images FOR ALL USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND creator_id = auth.uid()));
CREATE POLICY "Staff manage sub-tables" ON public.listing_versions FOR ALL USING (public.is_staff());

-- ─── 7. SOCIAL (Comments, Reviews) ──────────────────
CREATE POLICY "Public read comments" ON public.comments FOR SELECT USING (deleted_at IS NULL OR public.is_staff());
CREATE POLICY "Users insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owners manage comments" ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Staff manage comments" ON public.comments FOR ALL USING (public.is_staff());

CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Owners manage reviews" ON public.reviews FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Staff manage reviews" ON public.reviews FOR ALL USING (public.is_staff());

-- ─── 8. PRIVATE USER DATA (Favorites, Follows, Notification) ────
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Staff view audit notifications" ON public.notifications FOR SELECT USING (public.is_staff());

-- ─── 9. MESSAGES (Private) ──────────────────────────
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users send messages" ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- ─── 10. REPORTS (Moderation) ──────────────────────
CREATE POLICY "Users can report" ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Staff view reports" ON public.reports FOR SELECT 
USING (public.is_staff());

CREATE POLICY "Staff update reports" ON public.reports FOR UPDATE 
USING (public.is_staff());

-- ─── 11. DOWNLOADS ──────────────────────────────────
CREATE POLICY "Public insert downloads" ON public.downloads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own downloads" ON public.downloads FOR SELECT USING (auth.uid() = user_id OR public.is_staff());
