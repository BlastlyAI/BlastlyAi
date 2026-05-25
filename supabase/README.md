# Supabase (Blastly Vercel deploy)

## Fix your errors (PGRST204 / PGRST205)

If the browser shows:

- `Could not find the 'business_name' column` (PGRST204)
- `Could not find the 'display_name' column` (PGRST204)
- `Could not find the table 'public.workspaces'` (PGRST205)

**Your Supabase database is missing migrations.** Run SQL in the SQL Editor:

### Quick fix (only missing columns + workspaces)

1. [Supabase Dashboard](https://supabase.com/dashboard) → project **BlastlyAi** → **SQL Editor**
2. Paste and run: **`supabase/migrations/FIX_MISSING_COLUMNS_ONLY.sql`**
3. Wait 1 minute (or **Settings → API → Reload schema**)
4. In the browser: DevTools → Application → **Session storage** → delete `blastly_supabase_schema`
5. Hard refresh the app (`Ctrl+Shift+R`)

### Full setup (new project)

1. Run **`supabase/migrations/RUN_ALL_IN_SUPABASE.sql`** (entire file)
2. Same reload / refresh steps as above

Or run the three files separately in order:

1. `00000000000000_initial_public_tables.sql`
2. `00000000000001_workspaces_and_profile_fields.sql`
3. `00000000000002_users_insert_policy.sql`

## `invalid_credentials`

This is **not** a schema issue — Supabase Auth rejected the email/password.

- Use the **exact** email and password from signup
- Or **Forgot password** on the login page
- Or create a **new account** with a different email

## Auth

- Sign up creates a row in **Authentication → Users** and **public.users** (via trigger).
- The client also upserts optional fields (`business_name`, `industry`, `display_name`) after signup.
- Password reset uses Supabase email links → `/reset-password` on your Vercel domain (add to Auth redirect URLs).

## Tables

| Table | Purpose |
|-------|---------|
| `public.users` | Profile per auth user |
| `public.workspaces` | Default workspace per user |
| `public.posts` | User-owned posts (RLS) |
| `public.notifications` | In-app notifications (RLS) |
| `public.audit_reports` | AI audit results (share token + JSON report) |

### Audit API env (Vercel / local `pnpm run dev`)

| Variable | Required for audits |
|----------|---------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server only) |
| `SUPABASE_URL` or `VITE_SUPABASE_URL` | Yes |
| `BUILT_IN_FORGE_API_URL` | Yes (LLM) |
| `BUILT_IN_FORGE_API_KEY` | Yes (LLM) |

Run migration: `00000000000003_audit_reports.sql`

MySQL/TiDB in `DATABASE_URL` is **optional** and only used by the legacy Express server.
