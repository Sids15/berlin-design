-- BERLIN — Row-Level Security. Apply after 001_schema.sql.
--
-- Model:
--   • Menu is public-read (available items to anon; everything to staff).
--   • Menu writes are manager-only; kitchen flips availability via the
--     set_item_availability() RPC (security definer), not a direct policy.
--   • Orders are staff-only. Customers never touch orders directly — they go
--     through our API routes, which use the service-role key (bypasses RLS).

alter table profiles         enable row level security;
alter table menu_categories  enable row level security;
alter table menu_items       enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;

-- --- Auto-create a profile when a staff user signs up ----------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- --- profiles --------------------------------------------------------------
create policy "read own or manager reads all" on profiles
  for select using (id = auth.uid() or current_role_name() = 'manager');

create policy "manager manages profiles" on profiles
  for all using (current_role_name() = 'manager')
  with check (current_role_name() = 'manager');

-- --- menu_categories -------------------------------------------------------
create policy "categories are public read" on menu_categories
  for select to anon, authenticated using (true);

create policy "manager writes categories" on menu_categories
  for all to authenticated
  using (current_role_name() = 'manager')
  with check (current_role_name() = 'manager');

-- --- menu_items ------------------------------------------------------------
-- Anon sees available items; any staff sees everything.
create policy "items readable" on menu_items
  for select to anon, authenticated
  using (is_available = true or current_role_name() is not null);

create policy "manager writes items" on menu_items
  for all to authenticated
  using (current_role_name() = 'manager')
  with check (current_role_name() = 'manager');

-- --- orders & order_items (staff only) -------------------------------------
create policy "staff read orders" on orders
  for select to authenticated using (current_role_name() is not null);
create policy "staff write orders" on orders
  for all to authenticated
  using (current_role_name() is not null)
  with check (current_role_name() is not null);

create policy "staff read order items" on order_items
  for select to authenticated using (current_role_name() is not null);
create policy "staff write order items" on order_items
  for all to authenticated
  using (current_role_name() is not null)
  with check (current_role_name() is not null);
