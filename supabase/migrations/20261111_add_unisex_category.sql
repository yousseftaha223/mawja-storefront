-- MAWJA: allow the Unisex product category on existing databases.
-- Run this once in the Supabase SQL Editor.
alter table public.products drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check
  check (category in ('men', 'women', 'unisex'));
