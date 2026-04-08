-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — ROW LEVEL SECURITY (RLS) POLICIES
-- Run AFTER schema.sql
-- ═══════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.platforms enable row level security;
alter table public.listings enable row level security;
alter table public.listing_versions enable row level security;
alter table public.listing_files enable row level security;
alter table public.listing_images enable row level security;
alter table public.tags enable row level security;
alter table public.listing_tags enable row level security;
alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.downloads enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.follows enable row level security;

-- ─── PROFILES ────────────────────────────────────────────
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── CATEGORIES ──────────────────────────────────────────
create policy "Categories are public"
  on public.categories for select using (true);

-- ─── PLATFORMS ───────────────────────────────────────────
create policy "Platforms are public"
  on public.platforms for select using (true);

-- ─── LISTINGS ────────────────────────────────────────────
create policy "Published listings are public"
  on public.listings for select
  using (status = 'published' and deleted_at is null);

create policy "Owners can view own drafts"
  on public.listings for select
  using (creator_id = auth.uid() and deleted_at is null);

create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = creator_id);

create policy "Owners can update own listings"
  on public.listings for update
  using (creator_id = auth.uid());

create policy "Owners can delete own listings"
  on public.listings for delete
  using (creator_id = auth.uid());

-- ─── LISTING VERSIONS ────────────────────────────────────
create policy "Listing versions are public if listing is published"
  on public.listing_versions for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'published' or l.creator_id = auth.uid())
    )
  );

create policy "Listing owners can manage versions"
  on public.listing_versions for insert
  with check (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can update versions"
  on public.listing_versions for update
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can delete versions"
  on public.listing_versions for delete
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

-- ─── LISTING FILES ───────────────────────────────────────
create policy "Files are public if listing is published"
  on public.listing_files for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'published' or l.creator_id = auth.uid())
    )
  );

create policy "Listing owners can insert files"
  on public.listing_files for insert
  with check (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can update files"
  on public.listing_files for update
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can delete files"
  on public.listing_files for delete
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

-- ─── LISTING IMAGES ──────────────────────────────────────
create policy "Images are public if listing is published"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'published' or l.creator_id = auth.uid())
    )
  );

create policy "Listing owners can insert images"
  on public.listing_images for insert
  with check (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can delete images"
  on public.listing_images for delete
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

-- ─── TAGS ────────────────────────────────────────────────
create policy "Tags are public"
  on public.tags for select using (true);

create policy "Authenticated users can create tags"
  on public.tags for insert
  with check (auth.uid() is not null);

-- ─── LISTING TAGS ────────────────────────────────────────
create policy "Listing tags are public if listing is published"
  on public.listing_tags for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'published' or l.creator_id = auth.uid())
    )
  );

create policy "Listing owners can manage tags"
  on public.listing_tags for insert
  with check (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

create policy "Listing owners can delete tags"
  on public.listing_tags for delete
  using (
    exists (select 1 from public.listings where id = listing_id and creator_id = auth.uid())
  );

-- ─── COMMENTS ────────────────────────────────────────────
create policy "Public comments on published listings are visible"
  on public.comments for select
  using (
    deleted_at is null and
    exists (select 1 from public.listings where id = listing_id and status = 'published')
  );

create policy "Authenticated users can comment"
  on public.comments for insert
  with check (auth.uid() = author_id);

create policy "Comment authors can soft-delete their comments"
  on public.comments for update
  using (auth.uid() = author_id);

-- ─── FAVORITES ───────────────────────────────────────────
create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ─── DOWNLOADS ───────────────────────────────────────────
create policy "Downloads are insertable by anyone"
  on public.downloads for insert
  with check (true);

create policy "Users can view own download history"
  on public.downloads for select
  using (auth.uid() = user_id);

-- ─── REVIEWS ─────────────────────────────────────────────
create policy "Reviews on published listings are public"
  on public.reviews for select
  using (
    deleted_at is null and
    exists (select 1 from public.listings where id = listing_id and status = 'published')
  );

create policy "Authenticated users can review"
  on public.reviews for insert
  with check (auth.uid() = author_id);

create policy "Review authors can update"
  on public.reviews for update
  using (auth.uid() = author_id);

-- ─── MESSAGES ────────────────────────────────────────────
create policy "Users can view their messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Authenticated users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Users can soft-delete their messages"
  on public.messages for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- ─── REPORTS ─────────────────────────────────────────────
create policy "Authenticated users can submit reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Reporters can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

-- ─── NOTIFICATIONS ───────────────────────────────────────
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ─── FOLLOWS ─────────────────────────────────────────────
create policy "Follows are public"
  on public.follows for select using (true);

create policy "Authenticated users can follow"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);
