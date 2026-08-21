# Supabase migrations

Versioned SQL for the ordering app's schema and Row-Level Security policies.
The real schema + seed land in **Feature 2 (Data layer)**:

- `NNN_schema.sql` — tables (`profiles`, `menu_categories`, `menu_items`,
  `orders`, `order_items`), enums, indexes.
- `NNN_rls.sql` — Row-Level Security policies per role.
- `../seed.sql` — a realistic sample menu.

Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
