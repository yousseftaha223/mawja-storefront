# Prompt for Claude: deploy the MAWJA storefront as a new version

I'm sending you a zip of the MAWJA storefront (single-page static site: `index.html` + `brand/` + `demo/`). Please:

1. **Repository (GitHub):** create a new repo `mawja-storefront` (or add these files to the existing repo if it already exists), commit the files as-is, and push to `main`.
2. **Deploy (Vercel):** connect the repo to a Vercel project as a static site. Framework preset: Other. Build command: none. Output directory: the root. Confirm the production URL works on desktop and mobile.
3. **Do not change the design.** Keep the colours (deep blue and sand), typography, layout, product image ratio (1:1, `object-fit: contain`, never cropped), the three size buttons (55, 35, 10 ml), the cart, and the WhatsApp order flow.
4. **Dashboard (new):** add a password-protected dashboard page (e.g. `/admin`) where the owner can edit, without touching code:
   - The **banner**: image upload and a **link** (a page on the site such as `#shop` or `#offers`, or a full URL). Clicking the banner navigates to that link. The current values are in `BANNER` in `index.html`.
   - **Products**: name, reference, both photos (`img` and `img2`), the three sizes with before and now prices (EGP), and availability per size (an unavailable size cannot be selected or bought).
   - **Now's offers**: which products appear on the offers page.
   - **Review videos**: add or remove videos for the review carousel.
   - Store the data in a backend (Supabase is already used in the original project). The site should read this data at runtime and fall back to the values in `index.html` if the backend is unreachable.
5. **Placeholders still to be filled by the owner. Do not invent them:**
   - Per-product prices (currently the same placeholder prices for every product).
   - FAQ text (aging, alcohol, etc.). The FAQ section is hidden until the owner supplies the exact text.
   - Privacy policy and Terms & Conditions text.
   - Facebook URL (not provided yet).
   - Store email (the footer uses WhatsApp for contact for now).
6. **Testing before you report back:** check desktop and mobile widths for no horizontal overflow, no console errors, the size buttons updating prices on the homepage and product page, add-to-cart using the selected size, the banner link navigating, and the header logo at the centre on desktop.

Report what you deployed (repo URL and production URL), what is in the dashboard, and which placeholders are still open.
