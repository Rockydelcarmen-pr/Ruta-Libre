# Protest Tracker App: Build Spec

## Overview
A web app (PWA, mobile-portable later) that lets users input their current location and destination, and checks that route against protest/march data registered by approved users. If a conflict is found, the app explains why and offers an alternate route plus full context on the protest (organizers, cause, links, calendar add).

## Stack
- **Frontend:** React + Vite, built as a PWA (`vite-plugin-pwa`, manifest + service worker for offline caching of last-fetched protest data)
- **Backend:** Fastify (Node.js/TypeScript)
- **Database:** PostgreSQL + PostGIS
- **Routing:** OpenRouteService (OSM-based; alternative routes + native `avoid_polygons`; self-hostable). Chosen over Google Directions to avoid a billing-account requirement and per-call cost. Isolated to `backend/src/lib/routing.ts`.
- **Map display:** MapLibre GL JS with a vector-tile style (MapTiler/Stadia/Protomaps).
- **i18n:** react-i18next (English/Spanish, toggle in settings)
- **Theming:** CSS custom properties, light/dark mode via `data-theme` attribute, stored in localStorage
- **Calendar export:** Google Calendar link (`calendar.google.com/calendar/render`) + downloadable `.ics` (via `ics` npm package)

## Architecture note
Keep business logic decoupled from UI so this can later port to React Native without a rewrite:
- `/src/lib` or `/src/core` -> matching logic, API client, geospatial helpers, calendar-link generation, i18n logic (framework-agnostic)
- `/src/components` -> React components (PWA-specific, rebuilt later for mobile)
- `/src/hooks` -> data-fetching/state hooks (mostly portable as-is)

## Database schema

```sql
users
  id, email, password_hash, role ('public' | 'approved' | 'admin'),
  preferred_language ('en' | 'es'), created_at

access_keys
  id, key_hash, role_grant ('approved'), used_by (nullable),
  expires_at, created_by

organizations
  id, name, description, website, social_links jsonb, created_at

protest_organizations
  protest_id, organization_id, role ('organizer' | 'participant')

protests
  id,
  title_en, title_es,
  cause_en, cause_es,
  goal_en, goal_es,
  description_en, description_es,
  event_date, start_time, estimated_duration_minutes,
  route geometry(LineString, 4326),
  external_links jsonb,
  status ('pending' | 'approved' | 'cancelled'),
  created_by, created_at
```

Note: bilingual fields are nullable. Fall back to whichever language exists if one is missing. No auto-translation for v1; approved users enter both manually if they can.

## Core matching logic

1. Frontend sends the user's current location + destination to `POST /api/protests/match`.
2. Backend calls OpenRouteService (server-side key) for the primary route plus alternatives.
3. Backend runs PostGIS `ST_DWithin` (buffer ~200m) between the returned route geometry and each approved, upcoming protest's route geometry.
4. If conflict(s) found:
   - Check each ORS alternative against the same conflict query, return the first clean one.
   - If none are clean, build a buffered avoid polygon from the conflicting protest routes (`ST_Buffer` + `ST_Union` in PostGIS) and re-request an ORS route with `avoid_polygons`, getting a direct avoidance route in one call.
5. Return the clean/suggested route **and** the full protest object so the frontend can explain the reroute to the user (not just silently reroute).

## API endpoints

```
POST /api/auth/register-with-key    -- redeem access key, creates 'approved' user
POST /api/auth/login

POST   /api/protests                -- approved/admin only, create protest incl. route
PATCH  /api/protests/:id            -- approved/admin only
GET    /api/protests                -- public, list active/upcoming
GET    /api/protests/:id            -- public, full detail incl. organizers/links
POST   /api/protests/match          -- public, takes current_location + destination,
                                        returns conflict info + suggested route
```

## Match response shape (example)

```json
{
  "conflict": true,
  "protest": {
    "id": "...",
    "title": "...",
    "cause": "...",
    "goal": "...",
    "organizers": [{ "name": "...", "role": "organizer", "website": "..." }],
    "participants": ["..."],
    "external_links": ["..."],
    "route_geojson": "...",
    "event_date": "...",
    "start_time": "...",
    "estimated_duration_minutes": 0
  },
  "suggested_route": {},
  "calendar_links": {
    "google": "https://calendar.google.com/calendar/render?...",
    "ics_download_url": "..."
  }
}
```

## Feature checklist for v1
- [ ] Access-key-gated registration for approved users (key generated/hashed by admin)
- [ ] JWT auth, role-based write access (approved/admin only can POST/PATCH protests)
- [ ] Manual route input for approved users (click points on Google Map -> stored as PostGIS LineString)
- [ ] Public match endpoint with conflict detection + alternate route logic + explanation payload
- [ ] Organization normalization (orgs entered once, linked to multiple protests)
- [ ] Bilingual content fields (EN/ES) with fallback
- [ ] Light/dark mode toggle
- [ ] Google Calendar link + .ics download per protest
- [ ] PWA setup: manifest, service worker, offline caching of last-fetched protest list

## Parking: legal parking + community chips (added after the initial draft)

Two layers, surfaced in-app (no push notifications for v1):

**Legal parking (authoritative, persistent).** Nearby legal parking is shown when
planning a route / at the destination. Data merges an admin-curated `parking_spots`
table with live OpenStreetMap `amenity=parking` (Overpass, cached ~5 min,
best-effort so it never breaks the endpoint).

**Community chips (ephemeral).** Logged-in users drop a "chip" at a spot with
potential parking. Others see live chips nearby. Marking a chip taken takes it
down for everyone; chips also auto-expire after `CHIP_TTL_MINUTES` (default 90)
so the layer self-cleans. Live = `status = 'available'` AND not expired.

Because posting a chip requires a logged-in user, public self-signup was added
(`POST /api/auth/register`, role `public`). Reading parking/chips is public.

### Schema (migration 002)
- `parking_spots(id, name, kind, location Point 4326, capacity, notes_en/es, source, osm_id, created_by, created_at)`
- `parking_chips(id, location Point 4326, note, status, reported_by, created_at, expires_at, taken_by, taken_at)`

### Endpoints
```
POST   /api/auth/register           -- public self-signup (role 'public')
GET    /api/parking?lat=&lng=&radius -- public: admin-curated + OSM merged
POST   /api/parking                 -- admin: add a legal spot
GET    /api/chips?lat=&lng=&radius   -- public: live chips near a point
POST   /api/chips                   -- logged-in: drop a chip
POST   /api/chips/:id/taken         -- logged-in: mark taken (removes it)
DELETE /api/chips/:id               -- owner or admin
```

Chip UI works with plain device geolocation (drop where you stand; list nearby),
so it does not require the map. Later: Web Push, rate limiting on chip creation,
chip confirmations ("still there?") to extend life, real-time via SSE/WebSocket
instead of polling.

## Not in scope for v1
- Auto-translation of protest content
- Web Push notifications for parking/chips (in-app display only for v1)
- React Native rebuild (later phase, once traction/mobile need justifies it)
- App store distribution (PWA install via "Add to Home Screen" for now)
