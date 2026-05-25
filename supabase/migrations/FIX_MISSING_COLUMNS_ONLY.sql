-- Run this in Supabase → SQL Editor if you see PGRST204 / PGRST205 errors.
-- Safe to run multiple times.

-- Profile columns on public.users
alter table public.users
  add column if not exists display_name text,
  add column if not exists business_name text,
  add column if not exists industry text,
  add column if not exists welcome_completed boolean not null default false;

-- Workspaces table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

alter table public.workspaces enable row level security;

drop policy if exists "Workspaces select own" on public.workspaces;
create policy "Workspaces select own" on public.workspaces
  for select using (auth.uid() = owner_id);

drop policy if exists "Workspaces insert own" on public.workspaces;
create policy "Workspaces insert own" on public.workspaces
  for insert with check (auth.uid() = owner_id);

drop policy if exists "Workspaces update own" on public.workspaces;
create policy "Workspaces update own" on public.workspaces
  for update using (auth.uid() = owner_id);

drop policy if exists "Workspaces delete own" on public.workspaces;
create policy "Workspaces delete own" on public.workspaces
  for delete using (auth.uid() = owner_id);

drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);
