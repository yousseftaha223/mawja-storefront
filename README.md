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
