# Protest Tracker: Phased Build Plan

Derived from [docs/handoff.md](docs/handoff.md). This is the working roadmap. Each
phase is shippable-ish on its own; check items off as they land. The v1 feature
checklist from the spec is mapped into the phases below (each spec feature is
tagged `[spec]`).

## Target layout (monorepo)

```
protest-tracker/
  frontend/        React + Vite PWA
    src/
      lib/         framework-agnostic: api client, matching helpers, geo, calendar, i18n
      hooks/       data-fetching / state hooks (portable)
      components/  React UI (PWA-specific)
  backend/         Fastify + TypeScript
    src/
      routes/      auth, protests, match
      db/          schema, migrations, queries
      lib/         geospatial + routing + calendar helpers
  docs/
```

Business logic lives in `frontend/src/lib` and `backend/src/lib` so a future
React Native port reuses the core without a rewrite.

---

## Prerequisites (you supply)
These are external and must be provisioned before the matching/map features work:
- [ ] **Google Cloud project** with Maps JavaScript API + Directions API enabled, and an API key (frontend key restricted by HTTP referrer; a separate server key for Directions calls made from the backend).
- [ ] **PostgreSQL 15+ with PostGIS** (local Docker for dev, managed instance for prod). Decide host: local Docker vs. Supabase/Neon (note: confirm PostGIS availability on the managed option chosen).
- [ ] Decide **JWT secret** management and where env vars live (`.env`, never committed).

---

> **Progress (first build session):** Phases 0-5 (backend) and the Phase 6
> foundation are written and typecheck/build clean with 0 npm audit vulns. They
> have **not been run against a live Postgres/PostGIS or the Google APIs yet** —
> that needs the Prerequisites above. Runtime verification (migrate + seed + hit
> the endpoints) is the next concrete step once a DB is available.

## Phase 0 — Repo & tooling
- [x] Create repo, git init
- [x] Handoff spec preserved in `docs/`
- [x] This plan
- [x] Monorepo scaffolding (npm workspaces: `backend`, `frontend`)
- [x] `.env.example` files for frontend + backend
- [x] Dev Postgres+PostGIS via `docker-compose.yml`
- [ ] ESLint/Prettier config (deferred)

## Phase 1 — Backend foundation
- [x] Fastify + TS app skeleton, config loader (zod-validated env), health check
- [x] Postgres connection pool
- [x] Migration runner (plain SQL files + `_migrations` table) and folder
- [x] Error handling + request validation (zod)
- [ ] PostGIS extension check surfaced on boot (currently only in health/migration)

## Phase 2 — Data model + PostGIS `[spec: schema]`
- [x] Migrations for `users`, `access_keys`, `organizations`, `protest_organizations`, `protests`
- [x] `protests.route` as `geometry(LineString, 4326)` + GiST index
- [x] Seed script (sample orgs + protests with real LineStrings for local testing)
- [x] `[spec]` Organization normalization (orgs linked via `protest_organizations`)
- [x] `[spec]` Bilingual content fields (EN/ES) with nullable fallback at read time

## Phase 3 — Auth `[spec: access-key gating, JWT roles]`
- [x] `POST /api/auth/register-with-key` — redeem hashed (sha256) single-use key
- [x] `POST /api/auth/login` — bcrypt verify, issue JWT
- [x] JWT plugin + role guard (`public` | `approved` | `admin`)
- [x] Access-key generation + hashing utility (used by seed; admin endpoint TBD)

## Phase 4 — Protest CRUD `[spec: write access]`
- [x] `POST /api/protests` (approved/admin) — route LineString, orgs, bilingual fields, tx
- [x] `PATCH /api/protests/:id` (approved/admin) — dynamic partial update, tx
- [x] `GET /api/protests` (public) — active/upcoming list
- [x] `GET /api/protests/:id` (public) — full detail incl. organizers + links
- [x] Status lifecycle (`pending` -> `approved` -> `cancelled`) via create/patch
- [x] `GET /api/protests/:id/calendar.ics` — downloadable per-protest event

## Phase 5 — Match endpoint + geo logic `[spec: core matching]`
- [x] `POST /api/protests/match` — accepts origin + destination (server calls Directions)
- [x] PostGIS `ST_DWithin` conflict query (geography buffer) vs. approved, upcoming protests
- [x] Directions API `alternatives=true`, re-run conflict query, return first clean route
- [x] Fallback: perpendicular offset waypoint forced detour
- [x] Response includes full protest object + suggested route + calendar links (explains, no silent reroute)
- [x] `[spec]` Calendar links: Google render URL + `.ics` via `ics` package
- [ ] Rate limiting / abuse protection on `/match` (hits paid Directions API) — TODO

> Design note: the backend calls the Directions API itself (server key) rather
> than trusting a client-sent polyline. This centralizes the paid API and the
> key server-side. Revisit if we want the client to pass its own chosen route.

## Phase 6 — Frontend foundation
- [x] Vite 7 + React + TS app
- [x] `[spec]` PWA: `vite-plugin-pwa`, manifest, service worker, protest-list runtime cache
- [x] `[spec]` i18n: react-i18next, EN/ES, header toggle, fallback
- [x] `[spec]` Theming: CSS custom properties, `data-theme` light/dark, persisted in localStorage
- [x] API client + typed models in `src/lib` (framework-agnostic)
- [x] Protest list + card (bilingual, .ics download link)
- [x] Match panel shell (activates when `VITE_GOOGLE_MAPS_API_KEY` is set)
- [ ] Router (single view for now; add when detail/auth pages land)

## Phase 7 — Frontend features
- [ ] Google Maps JS SDK integration, location + destination input
- [ ] Match flow UI: show conflict explanation, protest context, suggested route
- [ ] Public protest list + detail views (organizers, cause, goal, links)
- [ ] `[spec]` Approved-user route input: click points on map -> LineString -> submit
- [ ] `[spec]` Per-protest Google Calendar link + `.ics` download
- [ ] Access-key registration + login screens

## Phase 8 — PWA offline + polish
- [ ] `[spec]` Offline caching of last-fetched protest list (service worker + IndexedDB/localStorage)
- [ ] Install prompt / "Add to Home Screen" affordance
- [ ] Loading/empty/error states, accessibility pass
- [ ] Basic tests (match logic unit tests, auth flow)

## Phase 9 — Deploy
- [ ] Backend hosting + managed Postgres/PostGIS
- [ ] Frontend static host (Vercel/Netlify) with env-injected Maps key
- [ ] CORS, rate limiting on public endpoints (esp. `/match`), secrets management
- [ ] CI (build + test)

---

## Open questions to resolve before/early in the build
- Managed Postgres choice and confirmed PostGIS support.
- Migration tool preference (node-pg-migrate vs. drizzle vs. raw SQL files).
- Validation lib (zod vs. Fastify JSON schema) — pick one and standardize.
- Is `/match` rate-limited/abuse-protected given it hits the paid Directions API?
- Access-key issuance flow: admin CLI, seed, or protected admin UI for v1?
