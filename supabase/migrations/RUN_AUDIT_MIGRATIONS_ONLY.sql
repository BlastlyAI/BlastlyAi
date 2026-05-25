-- Run this in Supabase → SQL Editor if you see:
-- "Could not find the table 'public.audit_reports' in the schema cache"
--
-- Requires: public.workspaces (from 00000000000001 or RUN_ALL_IN_SUPABASE.sql)

-- === 00000000000003_audit_reports.sql ===
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

drop policy if exists "Audit reports select by share token" on public.audit_reports;
create policy "Audit reports select by share token" on public.audit_reports
  for select using (true);

drop policy if exists "Audit reports select own workspace" on public.audit_reports;
create policy "Audit reports select own workspace" on public.audit_reports
  for select using (
    workspace_id is not null
    and exists (
      select 1 from public.workspaces w
      where w.id = audit_reports.workspace_id and w.owner_id = auth.uid()
    )
  );

drop policy if exists "Audit reports insert service" on public.audit_reports;
create policy "Audit reports insert service" on public.audit_reports
  for insert with check (auth.uid() = user_id or user_id is null);

-- === 00000000000004_audit_anon_insert.sql ===
drop policy if exists "Audit reports insert public" on public.audit_reports;
create policy "Audit reports insert public" on public.audit_reports
  for insert
  to anon, authenticated
  with check (share_token is not null and length(share_token) >= 8);

notify pgrst, 'reload schema';
