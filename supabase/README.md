# Supabase (Postgres) — hybrid with existing MySQL

This folder holds **SQL you run once** in the Supabase dashboard so tables appear under **Table Editor**.

The Express + Drizzle + **MySQL/TiDB** backend is unchanged; that remains the source of truth for the current app until you wire features to Supabase.

## Apply schema (required for `public.users` on signup)

The app calls **Supabase Auth `signUp` first**, then your existing **MySQL `customAuth.signup`**.  
The trigger in this migration inserts **`public.users`** when a row is added to **`auth.users`**.

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste the full contents of `migrations/00000000000000_initial_public_tables.sql`.
3. Click **Run**.

You should see **`public.users`**, **`public.posts`**, **`public.notifications`** in **Table Editor** (plus `auth.users` managed by Supabase Auth).

## Auth + `public.users`

The migration creates `public.users` keyed to `auth.users` and a trigger so a row is inserted when someone signs up via Supabase Auth.

## Keys

- **Frontend / Vercel:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publishable key only).
- **Server secrets:** use Supabase **service_role** only in backend env (not added to this repo by default).
