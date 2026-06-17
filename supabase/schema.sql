-- SecureApp — initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ─────────────────────────────────────────────────────────────
-- profiles: one row per auth user, auto-created on sign-up.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read and update only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- Auto-create a profile row whenever a new auth user is created.
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- scans: one row per security scan. summary/delta are computed
-- by the orchestrator when the scan completes.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  target_url    text not null,
  engine_id     text not null,
  config        jsonb not null default '{}'::jsonb,
  status        text not null default 'running',  -- running | complete | error
  authorized    boolean not null default false,
  summary       jsonb,   -- {critical,high,medium,low,info,total,score,grade}
  delta         jsonb,   -- {new,persisting,fixed}
  error         text,
  pages_scanned int not null default 0,
  requests_made int not null default 0,
  duration      int not null default 0,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- engine_state holds worker-engine progress (e.g. ZAP spider/ascan ids) between
-- polls. Added separately so re-running on an existing scans table picks it up.
alter table public.scans add column if not exists engine_state jsonb;

create index if not exists idx_scans_user_created on public.scans (user_id, created_at desc);
create index if not exists idx_scans_user_target  on public.scans (user_id, target_url, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "scans_own" on public.scans;
create policy "scans_own"
  on public.scans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- findings: one row per vulnerability in a scan. `fingerprint`
-- matches findings across scans to drive the "what changed?" delta.
-- (`refs` avoids the SQL reserved word `references`.)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.findings (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid not null references public.scans (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  fingerprint   text not null,
  delta_status  text,            -- new | persisting | fixed
  check_id      text,
  title         text not null,
  severity      text not null,   -- critical|high|medium|low|info
  category      text,
  standards     jsonb not null default '[]'::jsonb,
  url           text,
  parameter     text,
  evidence      text,
  description   text,
  impact        text,
  remediation   text,
  code_example  text,
  refs          jsonb not null default '[]'::jsonb,
  cvss          numeric,
  cwe           text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_findings_scan    on public.findings (scan_id);
create index if not exists idx_findings_user_fp on public.findings (user_id, fingerprint);

alter table public.findings enable row level security;

drop policy if exists "findings_own" on public.findings;
create policy "findings_own"
  on public.findings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
