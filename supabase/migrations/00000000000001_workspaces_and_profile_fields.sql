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
