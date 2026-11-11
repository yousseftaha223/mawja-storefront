# MAWJA Storefront + Admin Dashboard

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage) · Vercel

## Setup
1. Create a Supabase project. In **SQL Editor** run `supabase/schema.sql`, then `supabase/seed.sql` (demo data — prices are placeholders).
2. **Authentication → Users → Add user** (your admin email + password). Then run:
   `insert into admins (user_id) select id from auth.users where email = 'YOU@EXAMPLE.COM';`
3. Copy `.env.example` → `.env.local` and fill the 3 values (Project Settings → API).
4. `npm install && npm run dev` → site at `/`, dashboard at `/admin`.
5. Push to GitHub, import in Vercel, add the same 3 env vars. `SUPABASE_SERVICE_ROLE_KEY` must stay server-only (never `NEXT_PUBLIC_`).

## How it connects
Dashboard (Server Actions, signed-in admin session + RLS) → Supabase DB/Storage → public site.
Every save calls `revalidateTag`, so changes are live immediately; pages also revalidate every 60s (keeps scheduled start/end dates accurate).
Demo images live in `public/demo`; uploads from the dashboard go to the `media` Storage bucket. Remove demo data when real content is in.

## Checkout
Customers submit an **order request** (name, phone, address). The server re-prices every line from the database and stores it in `orders`; it appears in **/admin → Orders** with a status. No payment is taken — a payment gateway (Paymob/Fawry) is a separate integration.

## Open items
- Shellstone HEX was not supplied, so it is not used anywhere.
- Footer policy links are URLs set in the dashboard (no policy pages built).
