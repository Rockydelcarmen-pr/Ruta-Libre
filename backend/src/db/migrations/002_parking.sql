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

-- Ephemeral, community-reported parking "chips". A chip is live while
-- status = 'available' and expires_at > now(). Marking it taken (or letting it
-- expire) removes it from the live layer.
create table parking_chips (
  id uuid primary key default gen_random_uuid(),
  location geometry(Point, 4326) not null,
  note text,
  status text not null default 'available' check (status in ('available', 'taken')),
  reported_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  taken_by uuid references users(id) on delete set null,
  taken_at timestamptz
);

create index parking_chips_gix on parking_chips using gist (location);
create index parking_chips_live_idx on parking_chips (status, expires_at);
