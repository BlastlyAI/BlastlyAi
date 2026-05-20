# Supabase (Blastly Vercel deploy)

Run these SQL files **in order** in the Supabase SQL Editor:

1. `migrations/00000000000000_initial_public_tables.sql` — `users`, `posts`, `notifications`, RLS, auth trigger
2. `migrations/00000000000001_workspaces_and_profile_fields.sql` — profile columns, `workspaces`, default workspace trigger

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

MySQL/TiDB in `DATABASE_URL` is **optional** and only used by the legacy Express server.
