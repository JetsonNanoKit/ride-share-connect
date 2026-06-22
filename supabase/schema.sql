create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('offer', 'request')),
  title text not null,
  origin text not null,
  destination text not null,
  date date not null,
  time time not null,
  seats integer not null default 1 check (seats > 0),
  price text,
  phone text not null,
  description text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  content text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Posts are readable by everyone" on public.posts;
create policy "Posts are readable by everyone"
on public.posts for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
on public.posts for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
on public.posts for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "Comments are readable by everyone" on public.comments;
create policy "Comments are readable by everyone"
on public.comments for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments"
on public.comments for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
on public.comments for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
on public.comments for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "Ratings are readable by everyone" on public.ratings;
create policy "Ratings are readable by everyone"
on public.ratings for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own ratings" on public.ratings;
create policy "Users can create own ratings"
on public.ratings for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users can update own ratings" on public.ratings;
create policy "Users can update own ratings"
on public.ratings for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Users can delete own ratings" on public.ratings;
create policy "Users can delete own ratings"
on public.ratings for delete
to authenticated
using (auth.uid() = author_id);
