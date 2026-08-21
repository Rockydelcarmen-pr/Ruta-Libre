# Protest Tracker

A bilingual (EN/ES) PWA that routes people around active protests and marches.
Users enter a start and destination; the app checks that route against protest
data registered by approved organizers, and if it crosses one, explains why and
offers a clean alternate route plus full context on the protest (cause, goal,
organizers, links, calendar add).

Not a "avoid the protesters" tool in spirit: it surfaces *why* a march is
happening (organizers, cause, external links, add-to-calendar) so people can
choose to reroute, join, or plan around it with full information.

It also helps with the practical fallout: nearby **legal parking** (admin-curated
+ OpenStreetMap) is surfaced at the destination, and anyone can share ephemeral
parking **"chips"** (drop a spot with potential parking; others mark it taken,
which takes it down; chips auto-expire).

**No accounts for the public.** Looking up routes, protests, and parking needs no
login. Dropping a chip uses an anonymous **device token** (minted on first use,
only a hash stored, no email/password) — deliberate for a protest app, so there
are no user passwords to leak and nothing links a person to what they looked up.
The only real accounts are **organizers**, who register with an access key and
log in so their protest uploads are trustworthy.

Chip drops are **rate-limited** (per device and per IP) and pass a **coarse
presence check** — the request IP is cross-checked against the claimed spot using
a *local* geo-IP database (no third-party calls, nothing stored), so someone on
another continent can't plant a spot in San Juan. A browser's GPS can't be
cryptographically proven, so this raises the cost of spoofing rather than making
it impossible; true presence proof would need a native app. Geo-IP data is
MaxMind GeoLite2 (via `geoip-lite`), CC BY-SA 4.0.

## Status

Foundation in place. The backend API and the frontend PWA shell are written and
both typecheck / build cleanly (0 npm audit vulnerabilities). Not yet run against
a live database or the Google APIs — that needs a Postgres+PostGIS instance and
API keys (see Prerequisites in [PLAN.md](PLAN.md)). Map + route UI is
intentionally deferred behind the Maps key.

- [docs/handoff.md](docs/handoff.md) — the full build spec (stack, schema, API, matching logic)
- [PLAN.md](PLAN.md) — phased build plan with progress

## Stack

- **Frontend:** React + Vite 7, PWA (`vite-plugin-pwa`), react-i18next (EN/ES)
- **Backend:** Fastify 5 + TypeScript
- **Database:** PostgreSQL + PostGIS
- **Routing:** OpenRouteService (OSM-based, native avoid-area; self-hostable)
- **Map display:** MapLibre GL (deferred until a map style URL is set)

## Layout

```
backend/    Fastify API: auth, protest CRUD, PostGIS match engine, parking + chips
frontend/   Vite React PWA: bilingual UI, theming, protest list, match panel
docs/       build spec
```

## Getting started

Requires Node 20+. For the database you need Docker (for the bundled
`docker-compose.yml`) or any Postgres 15+ with PostGIS.

```bash
npm install                       # installs both workspaces

cp backend/.env.example backend/.env      # set JWT_SECRET; DATABASE_URL matches compose
cp frontend/.env.example frontend/.env.local

npm run db:up                     # start Postgres+PostGIS (Docker)
npm run db:migrate                # create the schema
npm run db:seed                   # admin user + access key + sample protests

npm run dev:api                   # backend on :3000
npm run dev:web                   # frontend on :5173 (proxies /api -> :3000)
```

The `/api/protests/match` endpoint returns a clean `503 routing_unconfigured`
until `ORS_API_KEY` is set in `backend/.env` (free hosted key at
openrouteservice.org, or point `ORS_BASE_URL` at a self-hosted instance); the
frontend map panel stays in its "pending" state until `VITE_MAP_STYLE_URL` is
set in `frontend/.env.local`.
