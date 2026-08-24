-- Ordered, deduped list of street names the route travels along, derived from
-- the organizer's drawn points via the routing provider. Best-effort: empty
-- when routing is unconfigured or the lookup fails, never blocks a save.
alter table protests add column streets text[] not null default '{}';
