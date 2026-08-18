-- Extensions
create extension if not exists postgis;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'public' check (role in ('public', 'approved', 'admin')),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'es')),
  created_at timestamptz not null default now()
);

-- Access keys: single-use invite keys that grant the 'approved' role on redemption.
-- Only key_hash is stored (sha256 of the plaintext key); plaintext is shown once at creation.
create table access_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text unique not null,
  role_grant text not null default 'approved' check (role_grant in ('approved')),
  used_by uuid references users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Organizations: normalized so an org is entered once and linked to many protests.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  website text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Protests: bilingual content (nullable, fall back at read time), route as a PostGIS LineString.
create table protests (
  id uuid primary key default gen_random_uuid(),
  title_en text,
  title_es text,
  cause_en text,
  cause_es text,
  goal_en text,
  goal_es text,
  description_en text,
  description_es text,
  event_date date not null,
  start_time time,
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes > 0),
  route geometry(LineString, 4326) not null,
  external_links jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint title_present check (title_en is not null or title_es is not null)
);

create index protests_route_gix on protests using gist (route);
create index protests_status_date_idx on protests (status, event_date);

-- Many-to-many: protests <-> organizations, with a per-link role.
create table protest_organizations (
  protest_id uuid not null references protests(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null default 'organizer' check (role in ('organizer', 'participant')),
  primary key (protest_id, organization_id, role)
);

create index protest_organizations_org_idx on protest_organizations (organization_id);
