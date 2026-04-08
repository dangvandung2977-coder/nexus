-- ═══════════════════════════════════════════════════════
-- NEXUS MARKET — SUPABASE SCHEMA
-- Run this in: Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ─── HELPER: auto-update updated_at ─────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── PROFILES ────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text not null unique,
  display_name  text,
  avatar_url    text,
  banner_url    text,
  bio           text,
  website       text,
  twitter       text,
  github        text,
  discord       text,
  role          text not null default 'user' check (role in ('user','creator','moderator','admin')),
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at_column();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 5))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── CATEGORIES ──────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  icon        text,
  color       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists categories_slug_idx on public.categories(slug);

-- ─── PLATFORMS ───────────────────────────────────────────
create table if not exists public.platforms (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  slug       text not null unique,
  icon       text,
  created_at timestamptz not null default now()
);

-- ─── LISTINGS ────────────────────────────────────────────
create table if not exists public.listings (
  id                  uuid primary key default uuid_generate_v4(),
  creator_id          uuid not null references public.profiles(id) on delete cascade,
  category_id         uuid references public.categories(id) on delete set null,
  title               text not null,
  slug                text not null unique,
  short_description   text not null,
  description         text not null default '',
  cover_image_url     text,
  status              text not null default 'draft' check (status in ('draft','published','archived','flagged')),
  price               numeric(10,2) not null default 0 check (price >= 0),
  currency            text not null default 'USD',
  external_url        text,
  youtube_url         text,
  license             text,
  is_open_source      boolean not null default false,
  platforms           text[] not null default '{}',
  supported_versions  text[] not null default '{}',
  dependencies        text[] not null default '{}',
  popularity_score    numeric not null default 0,
  view_count          bigint not null default 0,
  download_count      bigint not null default 0,
  favorite_count      bigint not null default 0,
  featured            boolean not null default false,
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists listings_creator_idx on public.listings(creator_id);
create index if not exists listings_status_idx on public.listings(status);
create index if not exists listings_slug_idx on public.listings(slug);
create index if not exists listings_popularity_idx on public.listings(popularity_score desc);
create index if not exists listings_created_idx on public.listings(created_at desc);
create index if not exists listings_category_idx on public.listings(category_id);
create index if not exists listings_title_trgm_idx on public.listings using gin(title gin_trgm_ops);

create trigger listings_updated_at before update on public.listings
  for each row execute function update_updated_at_column();

-- ─── LISTING VERSIONS ────────────────────────────────────
create table if not exists public.listing_versions (
  id             uuid primary key default uuid_generate_v4(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  version_number text not null,
  changelog      text,
  created_at     timestamptz not null default now()
);

create index if not exists listing_versions_listing_idx on public.listing_versions(listing_id);

-- ─── LISTING FILES ───────────────────────────────────────
create table if not exists public.listing_files (
  id             uuid primary key default uuid_generate_v4(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  version_id     uuid references public.listing_versions(id) on delete set null,
  file_name      text not null,
  file_path      text not null,
  file_size      bigint not null,
  file_type      text not null,
  download_count bigint not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists listing_files_listing_idx on public.listing_files(listing_id);

-- ─── LISTING IMAGES ──────────────────────────────────────
create table if not exists public.listing_images (
  id         uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_path text not null,
  alt_text   text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images(listing_id);

-- ─── TAGS ────────────────────────────────────────────────
create table if not exists public.tags (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists tags_slug_idx on public.tags(slug);

-- ─── LISTING TAGS (junction) ─────────────────────────────
create table if not exists public.listing_tags (
  listing_id uuid not null references public.listings(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  primary key (listing_id, tag_id)
);

create index if not exists listing_tags_tag_idx on public.listing_tags(tag_id);

-- ─── COMMENTS ────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_listing_idx on public.comments(listing_id);
create index if not exists comments_author_idx on public.comments(author_id);
create index if not exists comments_parent_idx on public.comments(parent_id);

create trigger comments_updated_at before update on public.comments
  for each row execute function update_updated_at_column();

-- ─── FAVORITES ───────────────────────────────────────────
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists favorites_listing_idx on public.favorites(listing_id);

-- sync favorite_count on listings
create or replace function sync_favorite_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.listings set favorite_count = favorite_count + 1,
      popularity_score = popularity_score + 2
    where id = new.listing_id;
  elsif TG_OP = 'DELETE' then
    update public.listings set favorite_count = greatest(0, favorite_count - 1),
      popularity_score = greatest(0, popularity_score - 2)
    where id = old.listing_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger favorites_count_trigger after insert or delete on public.favorites
  for each row execute function sync_favorite_count();

-- ─── DOWNLOADS ───────────────────────────────────────────
create table if not exists public.downloads (
  id         uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  file_id    uuid references public.listing_files(id) on delete set null,
  user_id    uuid references public.profiles(id) on delete set null,
  ip_hash    text,
  created_at timestamptz not null default now()
);

create index if not exists downloads_listing_idx on public.downloads(listing_id);
create index if not exists downloads_user_idx on public.downloads(user_id);

-- ─── REVIEWS ─────────────────────────────────────────────
create table if not exists public.reviews (
  id         uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, author_id)
);

create index if not exists reviews_listing_idx on public.reviews(listing_id);

create trigger reviews_updated_at before update on public.reviews
  for each row execute function update_updated_at_column();

-- ─── MESSAGES ────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid primary key default uuid_generate_v4(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body         text not null,
  read_at      timestamptz,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_recipient_idx on public.messages(recipient_id);
create index if not exists messages_conversation_idx on public.messages(sender_id, recipient_id);

-- ─── REPORTS (scaffold) ──────────────────────────────────
create table if not exists public.reports (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing','comment','profile')),
  target_id   uuid not null,
  reason      text not null,
  status      text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists reports_status_idx on public.reports(status);
create index if not exists reports_reporter_idx on public.reports(reporter_id);

-- ─── NOTIFICATIONS (scaffold) ────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read_at);

-- ─── FOLLOWS (scaffold) ──────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create index if not exists follows_following_idx on public.follows(following_id);

-- ─── RPC FUNCTIONS ───────────────────────────────────────
create or replace function public.increment_view_count(listing_id uuid)
returns void as $$
begin
  update public.listings
  set view_count = view_count + 1,
      popularity_score = popularity_score + 0.1
  where id = listing_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_download_count(listing_id uuid, file_id uuid)
returns void as $$
begin
  update public.listings
  set download_count = download_count + 1,
      popularity_score = popularity_score + 1
  where id = listing_id;

  update public.listing_files
  set download_count = download_count + 1
  where id = file_id;
end;
$$ language plpgsql security definer;
