# Free static hosting preparation

Prepared 24 November 2026. Local branch only. Nothing deployed.

## Recommendation

Use Cloudflare Pages Free for the static storefront and current product/review images. Keep Supabase for the order database and dashboard initially. Do not use Vercel Hobby for a commercial storefront: its Terms restrict Hobby to personal/non-commercial use.

Moving media stops future storage bandwidth from those images; it does not clear the 17.373GB already counted this cycle. Supabase may restrict the project after the 26 November grace deadline. Its FAQ says restrictions lift after the next quota refill, with a possible delay. The dashboard reports the current cycle ends 5 December 2026. Existing checkout, dashboard authentication and orders can still fail during that gap.

## What this branch prepares

- A fresh snapshot of the published catalog from Supabase, with17 products,22 shipping zones and15 reviews.
- Exact copies of the49 currently published optimized images,9,136,276bytes total. Filenames are deterministic URL hashes. No image recompression or content editing.
- A reproducible Python preview builder that embeds the snapshot before first paint and replaces all Supabase media URLs with local files.
- Static headers and the existing brand/demo assets.
- Local EN/AR tests at390px and1280px. Browsing makes zero Supabase requests, even with that domain blocked. Current first product10ml price130 is unchanged. No real order request was made.

Run `python3 scripts/prepare-pages-preview.py`, then `node scripts/test-static.cjs`. The generated `pages-preview/` is deliberately ignored.

## Not ready to deploy

**This is a browsing prototype, not a working Cloudflare checkout.** Do not upload `pages-preview/` as the live store.

The existing `/api/order` is a Vercel Node function and has not been ported to Pages Functions. `/admin` still uses Supabase directly. Options requiring approval and further tests:

1. Port the existing order handler to Pages Functions with server-only secrets. Normal orders still depend on Supabase and may fail under restriction. The known backend validation issues from the audit need a separate approved fix.
2. Use an explicit temporary WhatsApp-only order-request flow while Supabase is restricted. This must say that opening WhatsApp does not place an order, must not clear the cart as if saved, and must distinguish an uncertain already-submitted order from a new request. Do not silently resend after a timeout.
3. Move the order backend as a separate tested migration. This is larger work and would change storage, privacy, operations and dashboard assumptions.

The snapshot is intentionally static. Dashboard publishes will NOT update the generated Pages storefront until a new snapshot/build is prepared. A production plan needs an approved publishing workflow that refreshes both catalog and images, or a controlled live-catalog fallback with asset synchronization. Serving live Supabase image URLs would bring the bandwidth problem back. Refresh and compare the snapshot immediately before any future approved deploy.

PR6 review priority is not included in this branch and remains a separate draft.

No account was created, no secrets were copied, no DNS changed, no commit pushed, no production setting changed.

## Free-plan limits and terms

- Pages static requests are free and unlimited, not a promised uptime or immunity from throttling.
- Free:500 builds/month,20,000 files/site,25MiB/file. New video uploads may exceed the per-file limit.
- Pages Functions share Workers Free100,000requests/day, reset midnight UTC. Only dynamic requests count; static assets do not invoke Functions unless routed that way.
- Developer Platform terms explicitly permit hosting content and allow resource limits for undue burden. General terms do not contain Vercel's personal/non-commercial restriction. Free Services may be terminated; no service guarantee.
- Cloudflare Free terms prohibit collecting/processing card information. Current Mawja checkout is cash-on-delivery, no card collection. Do not add card fields to this plan.
- Continued domain registration renewal is separate from hosting costs.

## Official sources inspected

- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.cloudflare.com/pages/platform/limits/
- https://www.cloudflare.com/service-specific-terms-developer-platform/
- https://www.cloudflare.com/terms/
- https://vercel.com/legal/terms
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/platform/manage-your-usage/egress
- https://supabase.com/dashboard/org/aexvrnjkodkterbeogtu/usage

Cached egress applies only to Storage, according to Supabase FAQ. The dashboard does not break it down by individual file; do not assign shares to product photos, reviews or bots without logs.
