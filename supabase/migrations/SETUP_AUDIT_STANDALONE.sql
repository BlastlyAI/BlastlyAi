-- =============================================================================
-- Blastly: Create audit_reports table (standalone)
-- Run in Supabase → SQL Editor → New query → Run
--
-- Your project currently has: users, posts, notifications
-- This adds: audit_reports  (where /api/audit/run saves reports)
-- =============================================================================

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  workspace_id uuid,                                    -- optional, no FK required
  user_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
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

create index if not exists audit_reports_user_id_idx on public.audit_reports (user_id);
create index if not exists audit_reports_created_by_idx on public.audit_reports (created_by);

create index if not exists audit_reports_share_token_idx on public.audit_reports (share_token);
create index if not exists audit_reports_created_at_idx on public.audit_reports (created_at desc);
create index if not exists audit_reports_workspace_id_idx on public.audit_reports (workspace_id);

alter table public.audit_reports enable row level security;

-- Anyone can read guest audits; owners read their own (user-based — no workspaces required)
drop policy if exists "Audit reports select by share token" on public.audit_reports;
drop policy if exists "Audit reports select own or guest" on public.audit_reports;
create policy "Audit reports select own or guest" on public.audit_reports
  for select using (
    user_id is null
    or user_id = auth.uid()
  );

-- Server / anon inserts (local dev without service role key)
drop policy if exists "Audit reports insert service" on public.audit_reports;
create policy "Audit reports insert service" on public.audit_reports
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Audit reports insert public" on public.audit_reports;
create policy "Audit reports insert public" on public.audit_reports
  for insert
  to anon, authenticated
  with check (share_token is not null and length(share_token) >= 8);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
