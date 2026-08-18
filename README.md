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

Early. This repo currently holds the build spec and roadmap only — no app code
yet. See:

- [docs/handoff.md](docs/handoff.md) — the full build spec (stack, schema, API, matching logic)
- [PLAN.md](PLAN.md) — phased build plan mapped to the v1 feature checklist

## Stack (planned)

- **Frontend:** React + Vite, PWA (`vite-plugin-pwa`)
- **Backend:** Fastify + TypeScript
- **Database:** PostgreSQL + PostGIS
- **Maps/Routing:** Google Maps JS SDK + Directions API
- **i18n:** react-i18next (EN/ES)

## Getting started

Nothing to run yet. The first build session will scaffold `frontend/` and
`backend/` (see Phase 0 in [PLAN.md](PLAN.md)). Before the map/matching features
work you'll need a Google Maps API key (Maps JS + Directions API) and a
PostgreSQL + PostGIS instance — see the Prerequisites section in the plan.
