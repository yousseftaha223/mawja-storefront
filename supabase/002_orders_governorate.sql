-- MAWJA: adds the governorate to orders. Run once in Supabase -> SQL Editor (safe to run again).
alter table public.orders add column if not exists governorate text;
