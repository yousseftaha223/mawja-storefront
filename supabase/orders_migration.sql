-- Safe to run more than once. Creates the orders table + security only if missing.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_name text not null, phone text not null, city text, address text not null, notes text,
  items jsonb not null, subtotal numeric(10,2) not null,
  status text not null default 'new' check (status in ('new','confirmed','shipped','delivered','cancelled')),
  created_at timestamptz default now());
alter table orders enable row level security;
drop policy if exists "admin write" on orders;
create policy "admin write" on orders for all using (is_admin()) with check (is_admin());
-- No public policy on purpose: customer orders are inserted server-side with the service-role key.
