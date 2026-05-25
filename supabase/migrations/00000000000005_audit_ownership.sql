-- Audit ownership: user-based RLS (no public.workspaces required)
-- Safe to run when only users + audit_reports exist (SETUP_AUDIT_STANDALONE).
-- When workspaces are added later, run 00000000000006_audit_workspace_rls_optional.sql

alter table public.audit_reports
  add column if not exists created_by uuid references auth.users (id) on delete set null;

update public.audit_reports
set created_by = user_id
where created_by is null and user_id is not null;

create index if not exists audit_reports_user_id_idx on public.audit_reports (user_id);
create index if not exists audit_reports_created_by_idx on public.audit_reports (created_by);

-- Drop legacy permissive / workspace-scoped policies
drop policy if exists "Audit reports select by share token" on public.audit_reports;
drop policy if exists "Audit reports select own workspace" on public.audit_reports;
drop policy if exists "Audit reports select own or guest" on public.audit_reports;

-- Guest audits (user_id null): readable for share-link preview
-- Owned audits: only the owning user
create policy "Audit reports select own or guest" on public.audit_reports
  for select using (
    user_id is null
    or user_id = auth.uid()
  );

-- Claim anonymous audits after signup/login
drop policy if exists "Audit reports update claim" on public.audit_reports;
create policy "Audit reports update claim" on public.audit_reports
  for update using (
    user_id is null or user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );

notify pgrst, 'reload schema';
