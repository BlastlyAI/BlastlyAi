-- OPTIONAL: run only after public.workspaces exists (migration 00000000000001).
-- Extends audit RLS with workspace-owner access. Do not run if workspaces table is missing.

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

notify pgrst, 'reload schema';
