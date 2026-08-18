# Protest Tracker

A bilingual (EN/ES) PWA that routes people around active protests and marches.
Users enter a start and destination; the app checks that route against protest
data registered by approved organizers, and if it crosses one, explains why and
offers a clean alternate route plus full context on the protest (cause, goal,
organizers, links, calendar add).

Not a "avoid the protesters" tool in spirit: it surfaces *why* a march is
happening (organizers, cause, external links, add-to-calendar) so people can
choose to reroute, join, or plan around it with full information.

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
backend/    Fastify API: auth, protest CRUD, PostGIS match engine
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
