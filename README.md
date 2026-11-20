# MAWJA Storefront (static + one serverless function)

A single-page storefront. No build step. Orders go through `api/order.js` (Vercel function) into Supabase and Telegram. See `UPDATE-NOTES.md` for setup.

- `index.html`: the whole site (styles, scripts, product data, text in English and Arabic).
- `brand/`: logo, icon, beige variants, and the macro banner.
- `demo/`: product photos (1000x1000 each). Each product has a main photo and a second photo.

## Where things live (all in index.html)
- `SIZES`, `DEFAULT_PRICES`: sizes (55, 35, 10 ml) and placeholder prices (EGP, before/now).
- `PRODUCTS`: name, reference, category (`men`, `women`, `unisex`), photos (`img`, `img2`), `prices` and `available`, `notes` / `notesAr` (perfume notes) and `priority` (display order, lowest first) per product.
- `NOW_OFFERS`: slugs shown on the Now's offers page.
- `REVIEW_VIDEOS`: review slots, photos (`type: "image"`) or videos (src is empty until added).
- `SHIPPING_FEE` (90 EGP), `HOME_PAGE_SIZE` (products shown before "See more"), `ORDER_API`.
- `BANNER`: image and link of the banner under the hero.
- `BUNDLE`: the Winter Duo item (currently not shown on the page).
- `I18N`: all text, English and Arabic.
- `WA`: WhatsApp number used for order requests.

## Deploy
Static files. Deploy the folder to Vercel as a static site (no framework, no build command, output directory = root).

## Dashboard (/admin)
- `admin.html` (served at `/admin`): sign in with the Supabase admin account (listed in the `admins` table).
- Edits the banner (image + link), products (name, reference, category, display priority, perfume notes, two photos, 55/35/10 ml before/now prices, availability per size), Now's offers, review photos/videos, and the **Orders** tab (customer details, items, total, status).
- Saving writes one JSON file to Supabase Storage: `media/site/storefront.json` (plus a dated copy in `media/site/history/`).
- `index.html` reads that file at runtime. If it cannot be loaded, the values written in `index.html` are used.

## Orders
- Checkout posts to `/api/order` (`api/order.js`). The server re-prices the cart from `storefront.json`, adds the fixed 90 EGP shipping, saves the order in the Supabase table `orders` (`supabase/001_orders.sql`) and sends a Telegram message.
- Needs the environment variables listed in `.env.example` (set in Vercel, never in the page code).

## Vercel
`vercel.json`: clean URLs (`/admin`), security headers, and a fallback that serves `/demo` and `/brand` from this repo if a deployment was uploaded without them.
