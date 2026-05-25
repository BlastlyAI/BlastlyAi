-- =============================================================================
-- Blastly: Billing + AI assistant columns on public.users (standalone)
-- Run in Supabase → SQL Editor → New query → Run
--
-- Fixes: PGRST204 "Could not find the 'assistant_name' column of 'users'"
-- Required for: /api/billing/assistant, /api/billing/plan, upgrade flow
-- =============================================================================

alter table public.users
  add column if not exists plan_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists upgraded_at timestamptz,
  add column if not exists assistant_name text,
  add column if not exists assistant_tone text,
  add column if not exists assistant_personality text;

create index if not exists users_plan_tier_idx on public.users (plan_tier);
create index if not exists users_stripe_subscription_id_idx on public.users (stripe_subscription_id);

notify pgrst, 'reload schema';
