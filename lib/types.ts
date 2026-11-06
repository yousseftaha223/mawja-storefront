export type Variant = { id: string; product_id: string; size_ml: number; price: number; sale_price: number | null; sort_order: number };
export type Product = {
  id: string; name: string; slug: string; short_description: string | null; full_description: string | null;
  category: "men" | "women"; reference_fragrance: string | null; notes: string[]; is_available: boolean; is_featured: boolean;
  sort_order: number; status: "draft" | "published";
  product_variants: Variant[]; product_images: { id: string; path: string; sort_order: number }[];
};
export type BundleItem = { id: string; qty: number; product_id: string; variant_id: string | null; products: { name: string } | null; product_variants: { size_ml: number } | null };
export type Bundle = {
  id: string; name: string; description: string | null; image_path: string | null; promo_price: number; original_price: number | null;
  link_url: string | null; starts_at: string | null; ends_at: string | null; sort_order: number; status: "draft" | "published"; bundle_items: BundleItem[];
};
export type CartLine = { key: string; kind: "variant" | "bundle"; id: string; name: string; label: string; price: number; qty: number; image: string };
