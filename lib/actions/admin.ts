"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { supabaseServer } from "../supabase/server";
import { ORDER_STATUSES, PALETTE, SINGLETONS } from "../config";

type R = { ok: boolean; error?: string; id?: string };
async function requireAdmin() {
  const sb: any = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("Not authorized");
  return sb;
}
const refresh = (...tags: string[]) => { tags.forEach((t) => revalidateTag(t)); revalidatePath("/", "layout"); };
const URLOK = /^(https?:\/\/|\/|#|mailto:|tel:)/i;
const fail = (e: any): R => ({ ok: false, error: typeof e === "string" ? e : e?.code === "23505" ? "That slug is already used by another item." : e?.message || "Something went wrong." });

export async function saveSingleton(table: string, values: Record<string, any>): Promise<R> {
  try {
    const cfg = SINGLETONS[table]; if (!cfg) return fail("Unknown section.");
    const sb = await requireAdmin(); const row: Record<string, any> = {};
    for (const f of cfg.fields) {
      let v = values[f.name];
      if (f.type === "checkbox") v = !!v; else if (v === "" || v === undefined) v = null;
      if (f.required && !v) return fail(`${f.label} is required.`);
      if (f.type === "url" && v && !URLOK.test(v)) return fail(`${f.label} must start with https://, /, # , mailto: or tel:`);
      if (f.type === "color" && v && !PALETTE.some((p) => p.hex === v)) return fail("Choose a color from the Mawja palette.");
      row[f.name] = v;
    }
    if (row.starts_at && row.ends_at && new Date(row.ends_at) <= new Date(row.starts_at)) return fail("End date must be after the start date.");
    const { error } = await sb.from(table).update(row).eq("id", 1);
    if (error) return fail(error);
    refresh(cfg.tag); return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveProduct(p: any): Promise<R> {
  try {
    const sb = await requireAdmin();
    if (!p.name?.trim()) return fail("Product name is required.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || "")) return fail("Slug can only contain lowercase letters, numbers and dashes.");
    if (!["men", "women"].includes(p.category)) return fail("Choose a category.");
    const vars = (p.variants || []) as any[];
    if (!vars.length) return fail("Add at least one size with a price.");
    for (const v of vars) {
      if (!(v.size_ml > 0) || !(v.price > 0)) return fail("Every size needs a size and a price above 0.");
      if (v.sale_price != null && !(v.sale_price > 0 && v.sale_price < v.price)) return fail("Sale price must be lower than the regular price.");
    }
    const row = {
      name: p.name.trim(), slug: p.slug, short_description: p.short_description || null, full_description: p.full_description || null, category: p.category,
      reference_fragrance: p.reference_fragrance || null, notes: (p.notes || []).filter(Boolean), is_available: !!p.is_available, is_featured: !!p.is_featured,
      status: p.status === "published" ? "published" : "draft",
    };
    let id = p.id as string | undefined;
    if (id) { const { error } = await sb.from("products").update(row).eq("id", id); if (error) return fail(error); }
    else {
      const { data: last } = await sb.from("products").select("sort_order").eq("category", p.category).order("sort_order", { ascending: false }).limit(1);
      const { data, error } = await sb.from("products").insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }).select("id").single();
      if (error) return fail(error); id = data.id;
    }
    const keep = vars.filter((v) => v.id).map((v) => v.id);
    const { data: existing } = await sb.from("product_variants").select("id").eq("product_id", id);
    const drop = (existing || []).map((e: any) => e.id).filter((x: string) => !keep.includes(x));
    if (drop.length) await sb.from("product_variants").delete().in("id", drop);
    for (const [i, v] of vars.entries()) {
      const r = { product_id: id, size_ml: v.size_ml, price: v.price, sale_price: v.sale_price ?? null, sort_order: i };
      const { error } = v.id ? await sb.from("product_variants").update(r).eq("id", v.id) : await sb.from("product_variants").insert(r);
      if (error) return fail(error);
    }
    await sb.from("product_images").delete().eq("product_id", id);
    const imgs = (p.images || []).filter(Boolean).map((path: string, i: number) => ({ product_id: id, path, sort_order: i }));
    if (imgs.length) { const { error } = await sb.from("product_images").insert(imgs); if (error) return fail(error); }
    refresh("products"); return { ok: true, id };
  } catch (e) { return fail(e); }
}

export async function saveBundle(b: any): Promise<R> {
  try {
    const sb = await requireAdmin();
    if (!b.name?.trim()) return fail("Bundle name is required.");
    if (!(b.promo_price > 0)) return fail("Enter the promotional price.");
    if (b.original_price != null && !(b.original_price > 0)) return fail("Original price must be above 0.");
    if (b.link_url && !URLOK.test(b.link_url)) return fail("Link must start with https://, /, # , mailto: or tel:");
    if (b.starts_at && b.ends_at && new Date(b.ends_at) <= new Date(b.starts_at)) return fail("End date must be after the start date.");
    const items = (b.items || []).filter((i: any) => i.product_id);
    if (!items.length) return fail("Add at least one product to the bundle.");
    const row = {
      name: b.name.trim(), description: b.description || null, image_path: b.image_path || null, promo_price: b.promo_price, original_price: b.original_price ?? null,
      link_url: b.link_url || null, starts_at: b.starts_at || null, ends_at: b.ends_at || null, status: b.status === "published" ? "published" : "draft",
    };
    let id = b.id as string | undefined;
    if (id) { const { error } = await sb.from("bundles").update(row).eq("id", id); if (error) return fail(error); }
    else {
      const { data: last } = await sb.from("bundles").select("sort_order").order("sort_order", { ascending: false }).limit(1);
      const { data, error } = await sb.from("bundles").insert({ ...row, sort_order: (last?.[0]?.sort_order ?? 0) + 1 }).select("id").single();
      if (error) return fail(error); id = data.id;
    }
    await sb.from("bundle_items").delete().eq("bundle_id", id);
    const { error } = await sb.from("bundle_items").insert(items.map((i: any) => ({ bundle_id: id, product_id: i.product_id, variant_id: i.variant_id || null, qty: Math.max(1, Number(i.qty) || 1) })));
    if (error) return fail(error);
    refresh("bundles"); return { ok: true, id };
  } catch (e) { return fail(e); }
}

const TABLES = ["products", "bundles"];
export async function toggleStatus(table: string, id: string): Promise<R> {
  try {
    if (!TABLES.includes(table)) return fail("Invalid.");
    const sb = await requireAdmin();
    const { data } = await sb.from(table).select("status").eq("id", id).single();
    const { error } = await sb.from(table).update({ status: data.status === "published" ? "draft" : "published" }).eq("id", id);
    if (error) return fail(error); refresh(table); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function deleteItem(table: string, id: string): Promise<R> {
  try {
    if (!TABLES.includes(table)) return fail("Invalid.");
    const sb = await requireAdmin();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) return fail(error); refresh(table); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function moveItem(table: string, id: string, dir: -1 | 1): Promise<R> {
  try {
    if (!TABLES.includes(table)) return fail("Invalid.");
    const sb = await requireAdmin();
    const { data: row } = await sb.from(table).select("*").eq("id", id).single();
    let q = sb.from(table).select("id").order("sort_order").order("created_at");
    if (table === "products") q = q.eq("category", row.category);
    const { data: list } = await q; const ids: string[] = (list || []).map((x: any) => x.id);
    const i = ids.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await Promise.all(ids.map((x, n) => sb.from(table).update({ sort_order: n + 1 }).eq("id", x)));
    refresh(table); return { ok: true };
  } catch (e) { return fail(e); }
}
export async function updateOrderStatus(id: string, status: string): Promise<R> {
  try {
    if (!ORDER_STATUSES.includes(status)) return fail("Invalid status.");
    const sb = await requireAdmin();
    const { error } = await sb.from("orders").update({ status }).eq("id", id);
    if (error) return fail(error); revalidatePath("/admin"); return { ok: true };
  } catch (e) { return fail(e); }
}
