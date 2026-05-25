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
