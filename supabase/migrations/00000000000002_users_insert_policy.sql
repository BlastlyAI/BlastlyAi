-- Run in Supabase SQL Editor if login works in Auth but app shows "Login failed".
-- Fixes: allow users to insert/upsert their own public.users row (RLS).

drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);

-- Optional columns (safe if already applied in 00000000000001)
alter table public.users
  add column if not exists business_name text,
  add column if not exists industry text,
  add column if not exists welcome_completed boolean not null default false;
