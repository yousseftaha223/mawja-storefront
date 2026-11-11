-- DEMO DATA ONLY. Prices are placeholders; images point to /public/demo. Replace everything from /admin, then delete this data.
insert into site_settings (id, seo_title, seo_description, currency, order_note) values
 (1, 'MAWJA — Remember Yourself', 'Premium Egyptian fragrances inspired by globally loved scents. Find your signature scent.', 'EGP', 'Prices shown are final. Our team will contact you to confirm your order and delivery.');
insert into announcement (id, is_active, text, bg_color, text_color) values (1, true, 'Winter Edition — Discover Exclusive Fragrance Offers.', '#101F3A', '#F5EEE4');
insert into hero (id, image_path, headline, description, cta_label, cta_url) values
 (1, '/demo/hunter.jpg', 'Find Your Signature Scent.', 'Discover fragrances that bring you back to yourself.', 'Explore Fragrances', '#men');
insert into promo_image (id, is_active, image_path, ratio, alt_text) values (1, true, '/demo/gentle-knight.jpg', '16/9', 'Mawja Winter Edition');
insert into footer (id, brand_statement, instagram_url, tiktok_url, facebook_url, whatsapp_url, shipping_url, returns_url, privacy_url, copyright) values
 (1, 'Mawja is not just a perfume. It''s a lifestyle.', '#', '#', '#', '#', '#', '#', '#', '© Mawja. All rights reserved.');

insert into products (name, slug, short_description, category, reference_fragrance, sort_order, status) values
 ('Master', 'master', 'Inspired by Black Afgano', 'men', 'Black Afgano', 1, 'published'),
 ('Hunter', 'hunter', 'Inspired by Althair', 'men', 'Althair', 2, 'published'),
 ('Gentle Knight', 'gentle-knight', 'Inspired by Layton', 'men', 'Layton', 3, 'published'),
 ('Ecstasy', 'ecstasy', 'Inspired by Le Male Elixir', 'men', 'Le Male Elixir', 4, 'published'),
 ('بناية', 'banaya', 'Inspired by Khamra Qahwa', 'men', 'Khamra Qahwa', 5, 'published'),
 ('Bestie', 'bestie', 'Inspired by Erba Pura', 'women', 'Erba Pura', 1, 'published'),
 ('Fluffy', 'fluffy', 'Inspired by Kayali Marshmallow', 'women', 'Kayali Marshmallow', 2, 'published'),
 ('Honey', 'honey', 'Inspired by Bianco Latte', 'women', 'Bianco Latte', 3, 'published');
insert into product_variants (product_id, size_ml, price, sort_order) select id, 35, 350, 1 from products;
insert into product_variants (product_id, size_ml, price, sort_order) select id, 55, 500, 2 from products;
insert into product_images (product_id, path, sort_order) select id, '/demo/' || slug || '.jpg', 0 from products;

insert into bundles (name, description, image_path, promo_price, original_price, status, sort_order) values
 ('Winter Duo', 'Two signature scents, one limited-time price.', '/demo/honey.jpg', 850, 1000, 'published', 1);
insert into bundle_items (bundle_id, product_id, variant_id, qty)
 select (select id from bundles where name = 'Winter Duo'), p.id, v.id, 1 from products p join product_variants v on v.product_id = p.id and v.size_ml = 55 where p.slug in ('bestie', 'honey');
