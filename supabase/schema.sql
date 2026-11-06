-- MAWJA — run once in Supabase SQL Editor, then run seed.sql (demo data only).
create extension if not exists pgcrypto;

create table admins (user_id uuid primary key references auth.users on delete cascade);
create or replace function is_admin() returns boolean language sql security definer set search_path = public stable
as $$ select exists (select 1 from admins where user_id = auth.uid()) $$;

create table site_settings (id int primary key default 1 check (id = 1), seo_title text, seo_description text, currency text default 'EGP', order_note text);
create table announcement (id int primary key default 1 check (id = 1), is_active boolean default false, text text, bg_color text default '#101F3A', text_color text default '#F5EEE4', link_url text, starts_at timestamptz, ends_at timestamptz);
create table hero (id int primary key default 1 check (id = 1), image_path text, headline text, description text, cta_label text, cta_url text, cta2_label text, cta2_url text);
create table promo_image (id int primary key default 1 check (id = 1), is_active boolean default false, image_path text, link_url text, ratio text default '16/9', alt_text text);
create table footer (id int primary key default 1 check (id = 1), brand_statement text, contact_email text, contact_phone text, contact_address text, instagram_url text, tiktok_url text, facebook_url text, whatsapp_url text, shipping_url text, returns_url text, privacy_url text, copyright text);

create table products (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  short_description text, full_description text, category text not null check (category in ('men','women')),
  reference_fragrance text, notes jsonb not null default '[]', is_available boolean not null default true, is_featured boolean not null default false,
  sort_order int not null default 0, status text not null default 'draft' check (status in ('draft','published')), created_at timestamptz default now());
create table product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, size_ml int not null, price numeric(10,2) not null check (price > 0), sale_price numeric(10,2), sort_order int default 0);
create table product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, path text not null, sort_order int default 0);
create table bundles (
  id uuid primary key default gen_random_uuid(), name text not null, description text, image_path text, promo_price numeric(10,2) not null, original_price numeric(10,2),
  link_url text, starts_at timestamptz, ends_at timestamptz, sort_order int not null default 0, status text not null default 'draft' check (status in ('draft','published')), created_at timestamptz default now());
create table bundle_items (id uuid primary key default gen_random_uuid(), bundle_id uuid not null references bundles on delete cascade, product_id uuid not null references products on delete cascade, variant_id uuid references product_variants on delete set null, qty int not null default 1 check (qty > 0));
create table orders (
  id uuid primary key default gen_random_uuid(), number bigint generated always as identity, customer_name text not null, phone text not null, city text, address text not null, notes text,
  items jsonb not null, subtotal numeric(10,2) not null, status text not null default 'new' check (status in ('new','confirmed','shipped','delivered','cancelled')), created_at timestamptz default now());

-- Row Level Security
alter table admins enable row level security;
create policy "own row" on admins for select using (user_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['site_settings','hero','footer'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
  foreach t in array array['announcement','promo_image'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read active" on %I for select using (is_active)', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
  foreach t in array array['products','bundles','product_variants','product_images','bundle_items','orders'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "admin write" on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
create policy "public read published" on products for select using (status = 'published');
create policy "public read published" on bundles for select using (status = 'published');
create policy "public read" on product_variants for select using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public read" on product_images for select using (exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy "public read" on bundle_items for select using (exists (select 1 from bundles b where b.id = bundle_id and b.status = 'published'));
-- orders: NO public policy. Customers' orders are inserted server-side with the service-role key only.

insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin write" on storage.objects for all using (bucket_id = 'media' and is_admin()) with check (bucket_id = 'media' and is_admin());

-- After creating your admin user in Supabase Auth, authorize it:
--   insert into admins (user_id) select id from auth.users where email = 'YOU@EXAMPLE.COM';
