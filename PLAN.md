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

## Phase 0 — Repo & tooling (this commit)
- [x] Create repo, git init
- [x] Handoff spec preserved in `docs/`
- [x] This plan
- [ ] Monorepo scaffolding (package.json workspaces or two standalone packages) — deferred to first build session
- [ ] Shared TypeScript config, ESLint/Prettier
- [ ] `.env.example` files for frontend + backend
- [ ] Dev Postgres+PostGIS via `docker-compose.yml`

## Phase 1 — Backend foundation
- [ ] Fastify + TS app skeleton, config loader, health check
- [ ] Postgres connection pool, PostGIS extension check on boot
- [ ] Migration runner (node-pg-migrate or drizzle-kit) and folder
- [ ] Error handling + request validation (zod or Fastify schemas)

## Phase 2 — Data model + PostGIS `[spec: schema]`
- [ ] Migrations for `users`, `access_keys`, `organizations`, `protest_organizations`, `protests`
- [ ] `protests.route` as `geometry(LineString, 4326)` + GiST index
- [ ] Seed script (a couple of sample orgs + protests with real LineStrings for local testing)
- [ ] `[spec]` Organization normalization (orgs entered once, linked to many protests via `protest_organizations`)
- [ ] `[spec]` Bilingual content fields (EN/ES) with nullable fallback baked into read queries

## Phase 3 — Auth `[spec: access-key gating, JWT roles]`
- [ ] `POST /api/auth/register-with-key` — redeem hashed access key, create `approved` user
- [ ] `POST /api/auth/login` — bcrypt/argon2 verify, issue JWT
- [ ] JWT middleware + role guard (`public` | `approved` | `admin`)
- [ ] Admin-side access-key generation + hashing utility (CLI or protected endpoint)

## Phase 4 — Protest CRUD `[spec: write access]`
- [ ] `POST /api/protests` (approved/admin) — create incl. route LineString, orgs, bilingual fields
- [ ] `PATCH /api/protests/:id` (approved/admin)
- [ ] `GET /api/protests` (public) — active/upcoming list
- [ ] `GET /api/protests/:id` (public) — full detail incl. organizers + links
- [ ] Status lifecycle (`pending` -> `approved` -> `cancelled`)

## Phase 5 — Match endpoint + geo logic `[spec: core matching]`
- [ ] `POST /api/protests/match` — accept current_location + destination + user route polyline
- [ ] PostGIS `ST_DWithin` conflict query (~200m buffer) vs. approved, upcoming protests
- [ ] Directions API `alternatives=true`, re-run conflict query, return first clean route
- [ ] Fallback: perpendicular offset waypoint (~300-500m from protest route midpoint) forced detour
- [ ] Response includes full protest object + suggested route + calendar links (explain, don't silently reroute)
- [ ] `[spec]` Calendar links: Google render URL + `.ics` via `ics` package

## Phase 6 — Frontend foundation
- [ ] Vite + React + TS app, router
- [ ] `[spec]` PWA: `vite-plugin-pwa`, manifest, service worker
- [ ] `[spec]` i18n: react-i18next, EN/ES, settings toggle, fallback
- [ ] `[spec]` Theming: CSS custom properties, `data-theme` light/dark, persisted in localStorage
- [ ] API client + typed models in `src/lib`

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
