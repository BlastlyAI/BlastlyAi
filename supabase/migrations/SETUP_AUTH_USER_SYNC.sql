-- =============================================================================
-- Blastly: auth.users → public.users sync (standalone)
-- Run in Supabase → SQL Editor → Run
--
-- Fixes: empty public.users while auth.users has rows
-- Ensures: trigger on signup + backfill existing auth users
-- =============================================================================

-- Profile + billing columns (safe if already applied)
alter table public.users
  add column if not exists display_name text,
  add column if not exists business_name text,
  add column if not exists industry text,
  add column if not exists welcome_completed boolean not null default false,
  add column if not exists plan_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists upgraded_at timestamptz,
  add column if not exists assistant_name text,
  add column if not exists assistant_tone text,
  add column if not exists assistant_personality text,
  add column if not exists updated_at timestamptz not null default now();

-- Sync function: auth.users is source of truth for identity
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    display_name,
    created_at,
    updated_at,
    plan_tier,
    subscription_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.created_at, now()),
    now(),
    'free',
    'none'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.users.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

-- Trigger on new auth signups
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill existing auth users into public.users
insert into public.users (
  id,
  email,
  display_name,
  created_at,
  updated_at,
  plan_tier,
  subscription_status
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.created_at, now()),
  now(),
  'free',
  'none'
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.users.display_name, excluded.display_name),
      updated_at = now();

-- RLS: users manage own profile row
alter table public.users enable row level security;

drop policy if exists "Users select own" on public.users;
create policy "Users select own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "Users update own" on public.users;
create policy "Users update own" on public.users
  for update using (auth.uid() = id);

drop policy if exists "Users insert own" on public.users;
create policy "Users insert own" on public.users
  for insert with check (auth.uid() = id);

notify pgrst, 'reload schema';
