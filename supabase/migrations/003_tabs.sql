-- BERLIN — table sessions (tabs) + collective billing. Apply after 002_rls.sql.
--
-- A tab groups the rounds a table orders across one visit, so the bill is
-- collective while each round stays its own kitchen ticket. A table has at most
-- one OPEN tab at a time; closing it (payment) frees the table for a fresh one.

create type tab_status as enum ('open', 'closed');

create table tabs (
  id          uuid primary key default gen_random_uuid(),
  table_label text not null,
  status      tab_status not null default 'open',
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,
  closed_by   uuid references profiles (id) on delete set null
);

-- At most one open tab per table. A second round for that table joins the
-- existing open tab rather than opening another.
create unique index tabs_one_open_per_table
  on tabs (table_label) where status = 'open';
create index tabs_status_idx on tabs (status);

-- Link each order to its tab. Nullable: a table-less order stays standalone.
alter table orders add column tab_id uuid references tabs (id) on delete set null;
create index orders_tab_idx on orders (tab_id);

-- --- RLS: tabs are staff-only, like orders --------------------------------
alter table tabs enable row level security;

create policy "staff read tabs" on tabs
  for select to authenticated using (current_role_name() is not null);
create policy "staff write tabs" on tabs
  for all to authenticated
  using (current_role_name() is not null)
  with check (current_role_name() is not null);
