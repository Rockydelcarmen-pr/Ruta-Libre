-- Approved/listed organizations appear in the public directory and pre-load in
-- the organizer picker. Ad-hoc organizations named on a single protest (to
-- credit a group that is not in the official list) are listed = false: they show
-- on that protest only, and never pollute the directory or pre-load elsewhere.
alter table organizations add column listed boolean not null default true;

create index organizations_listed_idx on organizations (listed);
