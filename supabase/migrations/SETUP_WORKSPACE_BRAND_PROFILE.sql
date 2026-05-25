-- Brand profile columns on public.workspaces (standalone)
-- Run in Supabase SQL Editor after SETUP_WORKSPACES_STANDALONE.sql

alter table public.workspaces
  add column if not exists industry text,
  add column if not exists description text,
  add column if not exists primary_color text default '#6366f1',
  add column if not exists secondary_color text default '#f59e0b',
  add column if not exists tone_of_voice text default 'professional',
  add column if not exists target_audience text,
  add column if not exists tagline text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists google_review_url text,
  add column if not exists logo_url text;

notify pgrst, 'reload schema';
