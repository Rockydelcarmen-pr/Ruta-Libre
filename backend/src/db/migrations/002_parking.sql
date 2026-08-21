-- Legal, authoritative parking locations (admin-curated; OSM parking is fetched
-- live at query time and merged in, not stored here).
create table parking_spots (
  id uuid primary key default gen_random_uuid(),
  name text,
  kind text not null default 'lot' check (kind in ('lot', 'street', 'garage', 'other')),
  location geometry(Point, 4326) not null,
  capacity integer check (capacity is null or capacity >= 0),
  notes_en text,
  notes_es text,
  source text not null default 'admin' check (source in ('admin', 'osm')),
  osm_id text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index parking_spots_gix on parking_spots using gist (location);

-- Anonymous per-device identities. Community parking chips are attributed to a
-- device token, never to an email/password account: on first use the app mints a
-- token here (only the sha256 hash is stored) and keeps the plaintext on-device.
-- This deliberately holds no personal data, so there are no passwords to leak and
-- nothing that links a person to the protests/spots they looked at.
create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Ephemeral, community-reported parking "chips". A chip is live while
-- status = 'available' and expires_at > now(). Marking it taken (or letting it
-- expire) removes it from the live layer. Attribution is to an anonymous device.
create table parking_chips (
  id uuid primary key default gen_random_uuid(),
  location geometry(Point, 4326) not null,
  note text,
  status text not null default 'available' check (status in ('available', 'taken')),
  reported_by uuid references device_tokens(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  taken_by uuid references device_tokens(id) on delete set null,
  taken_at timestamptz
);

create index parking_chips_gix on parking_chips using gist (location);
create index parking_chips_live_idx on parking_chips (status, expires_at);
