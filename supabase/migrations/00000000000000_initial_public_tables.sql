-- Run this file in Supabase SQL Editor (once per project).
-- Creates public.users, public.posts, public.notifications + RLS.
-- Does not affect the existing MySQL/TiDB app database.

-- ─── public.users (profile row per auth user) ───────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-insert profile when a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(excluded.display_name, public.users.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─── public.posts ───────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_user_id_idx on public.posts (user_id);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ─── public.notifications ─────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_read_at_idx on public.notifications (read_at);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.notifications enable row level security;

-- Users: read/update own row only
drop policy if exists "Users select own" on public.users;
create policy "Users select own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users update own" on public.users;
create policy "Users update own" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);

-- Posts: full CRUD for own rows
drop policy if exists "Posts select own" on public.posts;
create policy "Posts select own" on public.posts
  for select using (auth.uid() = user_id);

drop policy if exists "Posts insert own" on public.posts;
create policy "Posts insert own" on public.posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Posts update own" on public.posts;
create policy "Posts update own" on public.posts
  for update using (auth.uid() = user_id);

drop policy if exists "Posts delete own" on public.posts;
create policy "Posts delete own" on public.posts
  for delete using (auth.uid() = user_id);

-- Notifications: read/update/delete own; insert own
drop policy if exists "Notifications select own" on public.notifications;
create policy "Notifications select own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Notifications insert own" on public.notifications;
create policy "Notifications insert own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Notifications update own" on public.notifications;
create policy "Notifications update own" on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "Notifications delete own" on public.notifications;
create policy "Notifications delete own" on public.notifications
  for delete using (auth.uid() = user_id);
