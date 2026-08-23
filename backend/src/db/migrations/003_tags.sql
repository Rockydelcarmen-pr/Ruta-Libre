-- Free-form tags on protests (organizations, coalitions, causes, years, etc.).
-- Used for browse-by-topic and search. GIN index for fast tag/array lookups.
alter table protests add column tags text[] not null default '{}';

create index protests_tags_idx on protests using gin (tags);
