# Protest Tracker App: Build Spec

## Overview
A web app (PWA, mobile-portable later) that lets users input their current location and destination, and checks that route against protest/march data registered by approved users. If a conflict is found, the app explains why and offers an alternate route plus full context on the protest (organizers, cause, links, calendar add).

## Stack
- **Frontend:** React + Vite, built as a PWA (`vite-plugin-pwa`, manifest + service worker for offline caching of last-fetched protest data)
- **Backend:** Fastify (Node.js/TypeScript)
- **Database:** PostgreSQL + PostGIS
- **Maps/Routing:** Google Maps JS SDK + Directions API (`alternatives=true` for reroute options)
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

1. Frontend gets user's current location + destination, calls Google Directions API for the route (polyline).
2. Sends that route to `POST /api/protests/match`.
3. Backend runs PostGIS `ST_DWithin` (buffer ~200m) between the user's route geometry and each approved, upcoming protest's route geometry.
4. If conflict(s) found:
   - Request Directions API alternatives (`alternatives=true`), check each against the same conflict query, return the first clean one.
   - If none are clean, compute an offset waypoint (perpendicular offset from the midpoint of the protest's route, ~300-500m) and request a new route through that waypoint as a forced detour.
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

## Not in scope for v1
- Auto-translation of protest content
- React Native rebuild (later phase, once traction/mobile need justifies it)
- App store distribution (PWA install via "Add to Home Screen" for now)
