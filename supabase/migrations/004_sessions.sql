-- BERLIN — table sessions. Apply after 003_tabs.sql.
--
-- A tab carries a secret session_token. A guest's device is bound to it via an
-- httpOnly cookie, so ordering follows the tab (not a guessable URL), and
-- closing the tab kills the token — no more orders from that device.

alter table tabs add column session_token text;
create index tabs_session_token_idx on tabs (session_token) where session_token is not null;
