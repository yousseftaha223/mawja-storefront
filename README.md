# MAWJA Storefront (static)

A single-page storefront. No build step.

- `index.html`: the whole site (styles, scripts, product data, text in English and Arabic).
- `brand/`: logo, icon, beige variants, and the macro banner.
- `demo/`: product photos (1000x1000 each). Each product has a main photo and a second photo.

## Where things live (all in index.html)
- `SIZES`, `DEFAULT_PRICES`: sizes (55, 35, 10 ml) and placeholder prices (EGP, before/now).
- `PRODUCTS`: name, reference, category, photos (`img`, `img2`), `prices` and `available` per product.
- `NOW_OFFERS`: slugs shown on the Now's offers page.
- `REVIEW_VIDEOS`: review video slots (src is empty until videos are added).
- `BANNER`: image and link of the banner under the hero.
- `BUNDLE`: the Winter Duo item (currently not shown on the page).
- `I18N`: all text, English and Arabic.
- `WA`: WhatsApp number used for order requests.

## Deploy
Static files. Deploy the folder to Vercel as a static site (no framework, no build command, output directory = root).

## Dashboard (/admin)
- `admin.html` (served at `/admin`): sign in with the Supabase admin account (listed in the `admins` table).
- Edits the banner (image + link), products (name, reference, two photos, 55/35/10 ml before/now prices, availability per size), Now's offers, and review videos.
- Saving writes one JSON file to Supabase Storage: `media/site/storefront.json` (plus a dated copy in `media/site/history/`).
- `index.html` reads that file at runtime. If it cannot be loaded, the values written in `index.html` are used.

## Vercel
`vercel.json`: clean URLs (`/admin`), security headers, and a fallback that serves `/demo` and `/brand` from this repo if a deployment was uploaded without them.
