# Blastly AI

Marketing intelligence SPA — **Vercel frontend + Supabase** (auth, profiles, workspaces, notifications).

## Quick start (local)

1. Copy `.env.example` → `.env` and set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**.
2. In [Supabase SQL Editor](https://supabase.com/dashboard), run migrations in order:
   - `supabase/migrations/00000000000000_initial_public_tables.sql`
   - `supabase/migrations/00000000000001_workspaces_and_profile_fields.sql`
3. Install and run the static frontend:

```bash
pnpm install
pnpm run dev:client   # or: npx vite --host
```

For full-stack local dev (optional Express + MySQL), use `pnpm run dev`.

## Vercel deployment

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | **Yes** | Must be set **before** `vite build` on Vercel |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Anon / publishable key only |
| `VITE_API_ORIGIN` | No | Legacy Express API only |

**Vite inlines `import.meta.env.VITE_*` at build time.** After adding or changing env vars in Vercel, **redeploy** (new build). Updating env without redeploying leaves the old bundle unchanged.

1. Vercel → **Settings → Environment Variables** → add both vars for **Production** and **Preview**
2. **Deployments → Redeploy** latest `main` (disable build cache if the last build lacked these vars)
3. Open the site → browser console should log `SUPABASE URL:` and `SUPABASE KEY EXISTS: true`

Build: `node scripts/verify-vite-env.mjs && vite build` → `dist/public`. On Vercel, missing vars **fail the build** with a clear message.

If a build shipped without vars, users see a **configuration screen** (not a black screen) until you redeploy with env set.

### Auth architecture

- **Sign up / login / logout** → Supabase Auth only (`supabase.auth.*`)
- **Profile** → `public.users` (auto-created by DB trigger on signup; client upserts optional fields)
- **Workspaces** → `public.workspaces` (default workspace created by trigger)
- **Notifications** → `public.notifications` with RLS

No MySQL, JWT cookie, or `customAuth` tRPC is required for authentication on Vercel.

### Supabase setup

Run both SQL migration files once per project. Enable **Email** provider under Authentication → Providers.

For password reset emails, add `https://your-app.vercel.app/reset-password` to **Redirect URLs** in Supabase Auth settings.

## Scripts

| Command | Purpose |
|--------|---------|
| `pnpm run dev` | Express + Vite (optional full stack) |
| `pnpm run build:vercel` | Static SPA → `dist/public` |
| `pnpm run check` | Typecheck |

## Legacy Express API

The `server/` folder remains for optional self-hosted deployments. Dashboard features that still call tRPC will use stubbed empty data when `VITE_API_ORIGIN` is unset; auth and core Supabase data work without it.
