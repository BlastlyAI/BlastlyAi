-- ═══════════════════════════════════════════════════════════════════════════
-- BLASTLY: Run this ENTIRE file once in Supabase → SQL Editor → New query → Run
-- Fixes: missing display_name, business_name, workspaces table (PGRST204/205)
-- ═══════════════════════════════════════════════════════════════════════════
--
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
-- Profile fields + workspaces for Supabase-only Vercel deployment.
-- Run after 00000000000000_initial_public_tables.sql in Supabase SQL Editor.

alter table public.users
  add column if not exists business_name text,
  add column if not exists industry text,
  add column if not exists welcome_completed boolean not null default false;

-- ─── public.workspaces ───────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- Default workspace when a profile row is created
create or replace function public.ensure_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.workspaces w where w.owner_id = new.id) then
    insert into public.workspaces (owner_id, name, slug)
    values (
      new.id,
      coalesce(new.business_name, 'My Workspace'),
      'workspace-' || substr(replace(new.id::text, '-', ''), 1, 12)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists users_ensure_default_workspace on public.users;
create trigger users_ensure_default_workspace
  after insert on public.users
  for each row execute function public.ensure_default_workspace();

-- ─── Row Level Security: workspaces ───────────────────────────────────────────
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

-- Allow users to insert their own profile row (signup upsert from client)
drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);
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
-- Audit reports for Supabase-only / Vercel deployment.
-- Run after workspaces migration (00000000000001).

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  business_name text not null,
  industry text,
  website text,
  handles jsonb,
  description text,
  detected_handles jsonb,
  geographic_reach text,
  ad_spend integer,
  overall_score integer,
  platform_scores jsonb,
  content_score integer,
  ad_quality_score integer,
  engagement_score integer,
  growth_score integer,
  cyber_security_score integer,
  findings jsonb,
  recommendations jsonb,
  blastly_pitch jsonb,
  raw_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_reports_workspace_id_idx on public.audit_reports (workspace_id);
create index if not exists audit_reports_share_token_idx on public.audit_reports (share_token);
create index if not exists audit_reports_created_at_idx on public.audit_reports (created_at desc);

alter table public.audit_reports enable row level security;

-- Public read: share_token acts as the secret (filter in queries)
drop policy if exists "Audit reports select by share token" on public.audit_reports;
create policy "Audit reports select by share token" on public.audit_reports
  for select using (true);

-- Authenticated users can list audits for workspaces they own
drop policy if exists "Audit reports select own workspace" on public.audit_reports;
create policy "Audit reports select own workspace" on public.audit_reports
  for select using (
    workspace_id is not null
    and exists (
      select 1 from public.workspaces w
      where w.id = audit_reports.workspace_id and w.owner_id = auth.uid()
    )
  );

-- Inserts from server use service role; clients use REST API
drop policy if exists "Audit reports insert service" on public.audit_reports;
create policy "Audit reports insert service" on public.audit_reports
  for insert with check (auth.uid() = user_id or user_id is null);
