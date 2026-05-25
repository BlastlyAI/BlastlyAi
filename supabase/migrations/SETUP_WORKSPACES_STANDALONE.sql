-- =============================================================================
-- Blastly: public.workspaces + audit linkage + RLS (standalone)
-- Run in Supabase → SQL Editor after SETUP_AUTH_USER_SYNC.sql
-- =============================================================================

-- Shared trigger helper (safe if already created by initial migration)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── workspaces table ───────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  business_name text not null default 'My Workspace',
  website text,
  plan_tier text not null default 'free',
  name text,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing installs that only had name/slug
alter table public.workspaces
  add column if not exists business_name text,
  add column if not exists website text,
  add column if not exists plan_tier text not null default 'free';

update public.workspaces
set business_name = coalesce(nullif(trim(business_name), ''), nullif(trim(name), ''), 'My Workspace')
where business_name is null or trim(business_name) = '';

alter table public.workspaces
  alter column business_name set default 'My Workspace';

create index if not exists workspaces_owner_id_idx on public.workspaces (owner_id);
create index if not exists workspaces_plan_tier_idx on public.workspaces (plan_tier);

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
    insert into public.workspaces (owner_id, business_name, name, slug, website, plan_tier)
    values (
      new.id,
      coalesce(nullif(trim(new.business_name), ''), 'My Workspace'),
      coalesce(nullif(trim(new.business_name), ''), 'My Workspace'),
      'workspace-' || substr(replace(new.id::text, '-', ''), 1, 12),
      null,
      coalesce(new.plan_tier, 'free')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists users_ensure_default_workspace on public.users;
create trigger users_ensure_default_workspace
  after insert on public.users
  for each row execute function public.ensure_default_workspace();

-- Backfill workspaces for existing users
insert into public.workspaces (owner_id, business_name, name, slug, website, plan_tier)
select
  u.id,
  coalesce(nullif(trim(u.business_name), ''), nullif(trim(u.display_name), ''), 'My Workspace'),
  coalesce(nullif(trim(u.business_name), ''), nullif(trim(u.display_name), ''), 'My Workspace'),
  'workspace-' || substr(replace(u.id::text, '-', ''), 1, 12),
  null,
  coalesce(u.plan_tier, 'free')
from public.users u
where not exists (select 1 from public.workspaces w where w.owner_id = u.id);

-- Link orphan audits to the owner's default workspace
update public.audit_reports ar
set workspace_id = w.id
from public.workspaces w
where ar.user_id = w.owner_id
  and ar.workspace_id is null
  and ar.user_id is not null;

-- ─── RLS: workspaces ──────────────────────────────────────────────────────────
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

-- ─── RLS: audit_reports (workspace-aware) ─────────────────────────────────────
drop policy if exists "Audit reports select own or guest" on public.audit_reports;
create policy "Audit reports select own or guest" on public.audit_reports
  for select using (
    user_id is null
    or user_id = auth.uid()
    or (
      workspace_id is not null
      and exists (
        select 1 from public.workspaces w
        where w.id = audit_reports.workspace_id and w.owner_id = auth.uid()
      )
    )
  );

drop policy if exists "Audit reports update claim" on public.audit_reports;
create policy "Audit reports update claim" on public.audit_reports
  for update using (
    user_id is null or user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

notify pgrst, 'reload schema';
