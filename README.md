# Ruta Libre (Protest Tracker)

Ruta Libre is a bilingual (English and Spanish) web app for finding and joining
protests and marches in Puerto Rico. Its primary purpose is discovery and
participation: people can see what protests are happening near them, read the
cause and who is organizing, RSVP, add an event to their calendar, and share it.
As a secondary feature, if someone is just trying to get somewhere and a march
is on their route, the app can warn them so they can join it or route around it.

The design is deliberately activist in tone, using a Puerto Rican flag palette
with the pro-independence light blue, and it works in both light and dark mode.
The interface language can be switched between English and Spanish anywhere in
the app.

## Status

Working and running against a live database. The backend API and the React
frontend are both implemented and typecheck cleanly. The app runs on a live
PostgreSQL and PostGIS database (a free Supabase instance during development),
serves real protest and organization data, and includes a full organizer and
admin toolset. The interactive map uses free OpenStreetMap tiles out of the box,
so no paid map key is required to run it.

Related documents:

- [docs/handoff.md](docs/handoff.md): the original build spec (stack, schema, API, matching logic).
- [PLAN.md](PLAN.md): the phased build plan with progress notes.

## What the app does

### For the public (no account needed)

- A bilingual events feed of upcoming protests, shown as bold cards with cause,
  date and time, organizers, tags, and an RSVP ("I'm going") button.
- An interactive street map (MapLibre with OpenStreetMap tiles) that draws each
  protest route and pins it, and redraws to match the current filters.
- Search and filtering: a free text search plus one tap filters by topic (tags)
  and by organizer.
- An organizations directory: a tappable list of listed organizations, each
  opening a profile page with the organization's details and its upcoming
  protests.
- Per event actions: add to calendar (Google Calendar link, generated client
  side so it works without any key), share, and a "See more" expander that shows
  the goal, additional details, organizers, and any external links.
- A first run disclosure that explains this is an early, one person project and
  that people should also check the official announcements from each protest's
  organizers.

### For organizers and admins

- Access key gated organizer accounts and an admin account. There is no public
  self signup. The organizer area is reached from an "Organizer" button in the
  header and is hidden behind login.
- A dashboard with two or three options depending on role: view all protests,
  create a protest, and (admin only) manage organizations.
- A draw on the map route tool: an organizer clicks along the streets to build
  the exact march route point by point, with undo and clear, then fills in the
  bilingual title and cause, date, start time, duration, tags, and organizers.
- Editing: any protest can be reopened in the same form, fully pre filled
  including the route drawn back onto the map, and saved.
- Deleting: protests and organizations can be deleted with a confirmation prompt.
- Ownership rules: admins can see, edit, and delete every protest regardless of
  status or date. Organizers can only see, edit, and delete the protests they
  personally created.
- Listed versus ad hoc organizations: the official directory only shows listed
  organizations. When an organizer types a new organization name while creating a
  protest, it is attached to that protest only and does not appear in the
  directory or pre load in the picker for anyone else.

### Parking pins

- Nearby legal parking (admin curated plus live OpenStreetMap data) can be
  surfaced, and people can drop ephemeral community parking pins that others can
  mark as taken.
- Pins are anonymous. On first use the app mints a per device token (only a hash
  is stored, no email or password), which is deliberate for a protest app so
  there are no user passwords to leak and nothing links a person to what they
  looked up.
- Pin actions are rate limited (per device and per IP) and pass a coarse presence
  check: the request IP is cross checked against the claimed location using a
  local geo IP database (no third party calls, nothing stored). A browser's GPS
  cannot be cryptographically proven, so this raises the cost of spoofing rather
  than making it impossible. Geo IP data is MaxMind GeoLite2 via geoip-lite,
  CC BY-SA 4.0.

## Stack

- Frontend: React with Vite, built as a PWA (vite-plugin-pwa), react-i18next for
  English and Spanish, MapLibre GL for the map, and Lenis for smooth momentum
  scrolling.
- Backend: Fastify 5 with TypeScript.
- Database: PostgreSQL with PostGIS.
- Routing (optional, for the avoid a protest feature): OpenRouteService.
- Map tiles: OpenStreetMap by default, or any MapLibre style via an environment
  variable.

## Layout

```
backend/    Fastify API: auth, protest CRUD, organizations, PostGIS match engine, parking and pins
frontend/   Vite React PWA: bilingual UI, theming, events feed, map, search, org directory, organizer tools
docs/       build spec
```

## Getting started

Requires Node 20 or newer. For the database you can use a free Supabase project
(PostgreSQL with PostGIS), a local Docker instance from the bundled
docker-compose.yml, or any Postgres 15 or newer with PostGIS.

```bash
npm install                          # installs both workspaces

cp backend/.env.example backend/.env       # set DATABASE_URL and JWT_SECRET
cp frontend/.env.example frontend/.env.local

npm run db:migrate                   # create the schema
npm run db:seed                      # admin user, access key, sample protests

npm run dev:api                      # backend on :3000
npm run dev:web                      # frontend on :5173 (proxies /api to :3000)
```

Notes:

- Set DATABASE_URL in backend/.env to your database connection string. For a
  managed database such as Supabase, use the connection string it gives you; SSL
  is enabled automatically for non local hosts.
- The seed prints a local admin login (admin@protest-tracker.local) and a one
  time organizer access key.
- The map works with no configuration using OpenStreetMap tiles. To use a custom
  style, set VITE_MAP_STYLE_URL in frontend/.env.local.
- The avoid a protest routing feature uses OpenRouteService. Until ORS_API_KEY is
  set in backend/.env, the match endpoint returns a clear 503 and the rest of the
  app is unaffected.

## Test data

Protests loaded for development are tagged with EJEMPLO (example) and shown with a
red tag, so example data is never mistaken for a real protest. Real protests
simply do not carry that tag.
