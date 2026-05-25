-- Allows audit saves when only the anon key is on the server (local dev without service role).
-- Service role is still recommended for production.

drop policy if exists "Audit reports insert public" on public.audit_reports;
create policy "Audit reports insert public" on public.audit_reports
  for insert
  to anon, authenticated
  with check (share_token is not null and length(share_token) >= 8);
