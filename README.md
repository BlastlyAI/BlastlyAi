# Blastly / Promoflow AI

Full-stack app: **React (Vite) + Express + tRPC + MySQL (Drizzle)**.

## Local run (Windows)

```powershell
cd promoflow-ai
# Copy env and fill values (never commit `.env`)
copy .env.example .env
$env:NODE_ENV="development"
npx tsx watch server/_core/index.ts
```

Open **http://localhost:3000/**

Install deps: `npx pnpm@10.4.1 install`

## GitHub

Empty repo: [BlastlyAI/BlastlyAi](https://github.com/BlastlyAI/BlastlyAi)

```powershell
git init
git add .
git commit -m "Initial import"
git branch -M main
git remote add origin https://github.com/BlastlyAI/BlastlyAi.git
git push -u origin main
```

Use a **Personal Access Token** or GitHub Desktop if HTTPS asks for password.

**Do not commit** `.env` or `.project-config.json` (secrets). They are listed in `.gitignore`.

## Vercel (frontend only)

This repo builds a static SPA with `pnpm run build:vercel` → output **`dist/public`**.  
`vercel.json` is included so Vercel runs that build and SPA fallback.

1. Import [BlastlyAI/BlastlyAi](https://github.com/BlastlyAI/BlastlyAi) in Vercel.
2. **Environment variables** (Vercel → Project → Settings → Environment Variables): copy from `.env.example` all keys that start with `VITE_`, plus **`VITE_API_ORIGIN`** when your API is not on the same domain.

### Split frontend (Vercel) + API (Railway, Fly.io, VPS, etc.)

Set **`VITE_API_ORIGIN`** to your API base, e.g. `https://api.yourdomain.com` (no trailing slash).  
Then the browser will call tRPC, OAuth callback URL, social connect redirects, and webhook docs URLs against that host.

Your API must send **CORS** headers for your Vercel origin and support **credentials** if you use cookies across origins (often easier to put API and app under one parent domain).

## Supabase (later)

Supabase gives **PostgreSQL** + Auth + Storage. This project’s database layer is **MySQL** (`mysql2`, Drizzle `mysql` dialect). Moving “backend to Supabase” usually means:

- **Option A:** Use Supabase **only** for Auth / Storage / Edge Functions, and keep a MySQL-compatible DB elsewhere, **or** migrate schema + Drizzle to **Postgres** (larger change).
- **Option B:** Use Supabase Postgres + rewrite Drizzle schema for `postgresql` — not a one-click switch.

Plan the DB before pointing `DATABASE_URL` at Supabase.

## Scripts

| Command | Purpose |
|--------|---------|
| `pnpm run dev` | Dev server (Unix-style env in script; on Windows use `tsx` as in Local run) |
| `pnpm run build` | Production: Vite + bundle Express to `dist/` |
| `pnpm run build:vercel` | Static client only → `dist/public` |
| `pnpm run check` | Typecheck |
| `node scripts/smoke-check.mjs` | Quick local checks (needs `.env` + running server) |
