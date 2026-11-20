-- MAWJA: orders table. Run once in Supabase -> SQL Editor.
-- Safe to run again (it only creates what is missing and refreshes the policies).
--
-- How access works:
--   * Customers never touch this table directly. The Vercel function api/order.js inserts orders with the
--     service-role key (server only), which bypasses RLS.
--   * The dashboard (signed-in admins listed in public.admins) can read orders and change ONLY the status column.
--   * The anonymous (public) key has no access at all.

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        bigint generated always as identity (start with 1001),
  client_ref      text not null unique,                 -- per-attempt id from the browser: makes retries safe (no duplicate orders)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  customer_name   text not null,
  phone           text not null,
  address         text not null,
  items           jsonb not null,                       -- [{slug,name,ml,qty,unit_price,line_total}]
  subtotal        numeric(10,2) not null,
  shipping        numeric(10,2) not null,
  total           numeric(10,2) not null,
  price_source    text not null default 'server' check (price_source in ('server','client')),
  lang            text not null default 'en',
  status          text not null default 'new' check (status in ('new','confirming','confirmed','completed','cancelled')),
  telegram_sent   boolean not null default false,
  telegram_error  text
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_created_idx on public.orders (phone, created_at desc);

create or replace function public.orders_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.orders_touch_updated_at();

alter table public.orders enable row level security;

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
  for update to authenticated
  using      (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Column-level limits: public has nothing; admins can read everything but update only "status".
revoke all on public.orders from anon;
revoke all on public.orders from authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
