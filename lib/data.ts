import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { inWindow } from "./utils";
import type { Bundle, Product } from "./types";

// Public reads use the anon key; Row Level Security only exposes published rows.
// Every query is cached with a tag. Admin actions call revalidateTag(tag) so edits go live immediately;
// revalidate: 60 is the safety net (also keeps scheduled start/end dates accurate).
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
function cached<T>(key: string, tag: string, fn: (c: ReturnType<typeof db>) => Promise<T>, fallback: T): Promise<T> {
  return unstable_cache(async () => { try { return await fn(db()); } catch { return fallback; } }, [key], { tags: [tag], revalidate: 60 })();
}
const one = async (c: ReturnType<typeof db>, t: string): Promise<any> => { const r = await c.from(t).select("*").eq("id", 1).maybeSingle(); return r.data; };

export const getSettings = () => cached<any>("settings", "settings", (c) => one(c, "site_settings"), null);
export const getHero = () => cached<any>("hero", "hero", (c) => one(c, "hero"), null);
export const getPromo = () => cached<any>("promo", "promo", (c) => one(c, "promo_image"), null);
export const getFooter = () => cached<any>("footer", "footer", (c) => one(c, "footer"), null);
export async function getAnnouncement() {
  const a = await cached<any>("announcement", "announcement", (c) => one(c, "announcement"), null);
  return a && a.is_active && a.text && inWindow(a.starts_at, a.ends_at) ? a : null;
}
const PSEL = "*, product_variants(*), product_images(*)";
const tidy = (p: any): Product => ({
  ...p,
  product_variants: [...(p.product_variants || [])].sort((a, b) => a.size_ml - b.size_ml),
  product_images: [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order),
  notes: Array.isArray(p.notes) ? p.notes : [],
});
export const getProducts = (category: "men" | "women") =>
  cached<Product[]>(`products-${category}`, "products", async (c) => {
    const { data } = await c.from("products").select(PSEL).eq("status", "published").eq("category", category).order("sort_order");
    return (data || []).map(tidy);
  }, []);
export const getProduct = (slug: string) =>
  cached<Product | null>(`product-${slug}`, "products", async (c) => {
    const { data } = await c.from("products").select(PSEL).eq("status", "published").eq("slug", slug).maybeSingle();
    return data ? tidy(data) : null;
  }, null);
export async function getBundles() {
  const all = await cached<Bundle[]>("bundles", "bundles", async (c) => {
    const { data } = await c.from("bundles").select("*, bundle_items(id,qty,product_id,variant_id,products(name),product_variants(size_ml))").eq("status", "published").order("sort_order");
    return (data || []) as any;
  }, []);
  return all.filter((b) => inWindow(b.starts_at, b.ends_at));
}
