-- Nexus AI Studio — web SaaS schema (Milestone 1)
-- Run this in the Supabase SQL editor (or via the CLI) once, on your project.
-- It creates a `profiles` row per user, locked down with row-level security, and
-- a trigger that auto-creates the profile on sign-up. `plan` + `addons` are the
-- hooks Milestone 2/3 (Stripe + entitlements) will write to.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  plan        text not null default 'free',     -- 'free' | 'pro' | 'studio' (set by Stripe webhook later)
  addons      jsonb not null default '[]'::jsonb, -- e.g. ["nsfw"] a-la-carte unlocks
  stripe_customer_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read and update only their own profile. (plan/addons are written by
-- the service role from the Stripe webhook, which bypasses RLS — users can't
-- self-upgrade.)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
