-- BERLIN — merging tabs. Apply after 004_sessions.sql.
--
-- Two tables that want a single bill: the guest tab at one table folds its
-- rounds into another table's open tab. The absorbed tab is marked 'merged'
-- (not 'closed' — it was never paid) and points at the tab that survived it,
-- so the merge is traceable and the source tab can never be re-opened or paid.

-- New terminal status for an absorbed tab. Additive enum change; safe to run
-- outside the same transaction that later reads the value (Postgres 12+).
alter type tab_status add value if not exists 'merged';

-- Which tab absorbed this one (null unless status = 'merged').
alter table tabs
  add column merged_into uuid references tabs (id) on delete set null;
