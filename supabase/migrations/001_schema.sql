-- BERLIN — ordering app schema
-- Apply first, then 002_rls.sql, then ../seed.sql.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type staff_role   as enum ('manager', 'kitchen', 'server');
create type veg_type     as enum ('veg', 'non_veg', 'egg');
create type order_source as enum ('customer', 'server');
create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled');

-- ---------------------------------------------------------------------------
-- Staff profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  role       staff_role not null default 'server',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------
create table menu_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references menu_categories (id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric(10, 2) not null check (price >= 0),
  veg_type     veg_type not null default 'veg',
  tags         text[] not null default '{}',
  image_url    text,
  is_available boolean not null default true,
  is_signature boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index menu_items_category_idx on menu_items (category_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table orders (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,           -- short human code (e.g. B7K2Q9)
  table_label  text,
  status       order_status not null default 'pending',
  source       order_source not null default 'customer',
  subtotal     numeric(10, 2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references profiles (id) on delete set null
);
create index orders_status_idx on orders (status);
create index orders_created_idx on orders (created_at desc);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  menu_item_id   uuid references menu_items (id) on delete set null,
  name_snapshot  text not null,
  price_snapshot numeric(10, 2) not null,
  qty            int not null check (qty > 0),
  notes          text
);
create index order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Realtime: the kitchen board subscribes to these tables.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table menu_items;

-- ---------------------------------------------------------------------------
-- Helper: current user's staff role (null if not staff). Used by RLS.
-- ---------------------------------------------------------------------------
create or replace function current_role_name()
returns staff_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- Kitchen/manager 86-toggle: update ONLY availability, role-checked.
create or replace function set_item_availability(item uuid, available boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if current_role_name() not in ('kitchen', 'manager') then
    raise exception 'not authorised';
  end if;
  update menu_items set is_available = available where id = item;
end;
$$;
