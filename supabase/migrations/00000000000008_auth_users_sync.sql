-- auth.users → public.users sync + backfill
-- Run after initial public tables migration.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    display_name,
    created_at,
    updated_at,
    plan_tier,
    subscription_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.created_at, now()),
    now(),
    'free',
    'none'
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.users.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.users (
  id,
  email,
  display_name,
  created_at,
  updated_at,
  plan_tier,
  subscription_status
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.created_at, now()),
  now(),
  'free',
  'none'
from auth.users u
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.users.display_name, excluded.display_name),
      updated_at = now();

notify pgrst, 'reload schema';
