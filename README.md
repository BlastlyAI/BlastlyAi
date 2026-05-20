# Blastly / Promoflow AI

Full-stack app: **React (Vite) + Express + tRPC + MySQL (Drizzle)**.  
**Supabase Auth** runs in the **browser** (same signup/login UI): Supabase user + `public.users` (via SQL trigger), then existing **`customAuth`** + MySQL + JWT cookie unchanged.

## Local run

```powershell
cd promoflow-ai
copy .env.example .env
# Fill .env (never commit it). Then:
pnpm install
# or: npm install   (repo uses pnpm-lock.yaml; package-lock.json is gitignored)
pnpm run dev
# or: npm run dev
```

Open **http://localhost:3000/** — `cross-env` makes **`npm run dev`** work on Windows.

## Supabase (hybrid)

1. **Env (local + Vercel):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **publishable key only** (never `service_role` in `VITE_*`).
2. **SQL:** Supabase → **SQL Editor** → run `supabase/migrations/00000000000000_initial_public_tables.sql` (see `supabase/README.md`). Ensures **`public.users`** sync from **`auth.users`** on signup.
3. **Client:** `client/src/lib/supabase.ts`, `client/src/lib/supabaseAuth.ts`. Signup/login call Supabase first when env is set, then existing tRPC `customAuth`.

## GitHub

Repo: [BlastlyAI/BlastlyAi](https://github.com/BlastlyAI/BlastlyAi)

**Never commit:** `.env`, `.project-config.json`, Supabase **secret** keys, Stripe secrets, etc.

---

## Vercel deployment (static frontend)

| Setting | Value |
|--------|--------|
| **Framework preset** | None / Other (or Vite — `vercel.json` overrides build) |
| **Root directory** | `.` (repository root) |
| **Install** | Auto: Vercel detects **`pnpm-lock.yaml`** → `pnpm install` |
| **Build command** | `pnpm run build:vercel` (already in **`vercel.json`**) |
| **Output directory** | `dist/public` (already in **`vercel.json`**) |

`vercel.json` also sets SPA **rewrites** so client routes (e.g. `/command`, `/login`) resolve to `index.html`.

### Required environment variables (Vercel → Project → Settings → Environment Variables)

Add every **`VITE_*`** you use from local `.env` (Production + Preview as needed). Minimum for current app + Supabase hybrid:

| Variable | Notes |
|----------|--------|
| `VITE_SUPABASE_URL` | e.g. `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Publishable / anon** key only |
| `VITE_APP_ID` | Manus / app id if using Manus OAuth links |
| `VITE_OAUTH_PORTAL_URL` | e.g. `https://manus.im` |
| `VITE_APP_TITLE`, `VITE_APP_LOGO` | Branding |
| `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | If Map / Forge features used |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe.js (publishable only) |
| `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | If analytics enabled |

**When the API is not on the Vercel domain** (static deploy only):

| Variable | Example |
|----------|---------|
| `VITE_API_ORIGIN` | `https://api.yourdomain.com` (no trailing slash) |

In **production**, if `VITE_API_ORIGIN` is unset, the SPA does **not** call same-origin `/api/trpc` (which would return HTML from the Vercel SPA rewrite). Instead it uses a **built-in offline tRPC layer**: the marketing site and auth screens load, **Supabase** sign-in still works when configured, and dashboard actions that need MySQL/Express show a clear “API not configured” error instead of JSON parse failures. For full app behaviour, set `VITE_API_ORIGIN` to the public URL of your Express server (which must expose `/api/trpc`).

### Build notes

- `pnpm run build:vercel` may log a **large JS chunk** warning from Vite; it does **not** fail the build.
- Full server bundle: `pnpm run build` (Vite + `esbuild` for Express) — used for non-Vercel Node hosting, not required for static Vercel.

### Production Supabase

The Supabase client uses **`import.meta.env.VITE_*`**, inlined at **Vite build** time. Set the same variables in Vercel **before** deploy so production bundles contain the correct URL and anon key. Session persistence uses **browser storage** (`@supabase/supabase-js` defaults).

---

## MySQL vs Supabase Postgres

Primary app data: **MySQL/TiDB** (`DATABASE_URL`, Drizzle). Supabase **Postgres** tables are separate; hybrid auth writes to both when configured.

## Scripts

| Command | Purpose |
|--------|---------|
| `pnpm run dev` / `npm run dev` | Express + Vite dev |
| `pnpm run build` / `npm run build` | Vite + bundle Express → `dist/` |
| `pnpm run build:vercel` | Static SPA → `dist/public` |
| `pnpm run check` / `npm run check` | Typecheck |
| `node scripts/smoke-check.mjs` | Local smoke (needs `.env` + running server) |
