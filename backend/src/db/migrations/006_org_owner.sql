-- The organizer account that manages an organization's public profile (name,
-- description, website, social links). Set on creation; null for orgs that
-- predate this column, which only an admin can then edit until claimed.
alter table organizations add column owner_user_id uuid references users(id) on delete set null;

create index organizations_owner_idx on organizations (owner_user_id);
