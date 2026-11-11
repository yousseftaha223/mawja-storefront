"use server";
import { createClient } from "@supabase/supabase-js";
import { inWindow, unit } from "../utils";

type Line = { kind: "variant" | "bundle"; id: string; qty: number };
type Res = { ok: true; number: number; total: number } | { ok: false; error: string };

// Orders are validated and PRICED on the server from the database — client prices are never trusted.
export async function placeOrder(input: { lines: Line[]; customer: { name: string; phone: string; city: string; address: string; notes: string } }): Promise<Res> {
  const c = input.customer || ({} as any);
  const name = (c.name || "").trim(), phone = (c.phone || "").trim(), address = (c.address || "").trim(), city = (c.city || "").trim(), notes = (c.notes || "").trim().slice(0, 500);
  if (!name || name.length > 100) return { ok: false, error: "Please enter your name." };
  if (!/^[+\d][\d\s-]{6,18}$/.test(phone)) return { ok: false, error: "Please enter a valid phone number." };
  if (address.length < 5 || address.length > 300) return { ok: false, error: "Please enter your delivery address." };
  const lines = input.lines || [];
  if (!lines.length || lines.length > 30 || lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20)) return { ok: false, error: "Your cart is invalid. Please review it." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Ordering is not configured yet." };

  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const items: any[] = []; let subtotal = 0;
  const vIds = lines.filter((l) => l.kind === "variant").map((l) => l.id);
  const bIds = lines.filter((l) => l.kind === "bundle").map((l) => l.id);
  const vMap = new Map<string, any>(), bMap = new Map<string, any>();
  if (vIds.length) {
    const { data } = await s.from("product_variants").select("id,size_ml,price,sale_price,products!inner(name,status,is_available)").in("id", vIds);
    (data || []).forEach((v: any) => vMap.set(v.id, v));
  }
  if (bIds.length) {
    const { data } = await s.from("bundles").select("id,name,promo_price,status,starts_at,ends_at,bundle_items(qty,products(name),product_variants(size_ml))").in("id", bIds);
    (data || []).forEach((b: any) => bMap.set(b.id, b));
  }
  for (const l of lines) {
    if (l.kind === "variant") {
      const v = vMap.get(l.id);
      if (!v || v.products.status !== "published" || !v.products.is_available) return { ok: false, error: "An item in your cart is no longer available." };
      const price = unit(v); subtotal += price * l.qty;
      items.push({ kind: "variant", name: v.products.name, size_ml: v.size_ml, qty: l.qty, unit_price: price });
    } else {
      const b = bMap.get(l.id);
      if (!b || b.status !== "published" || !inWindow(b.starts_at, b.ends_at)) return { ok: false, error: "A bundle in your cart is no longer available." };
      const price = Number(b.promo_price); subtotal += price * l.qty;
      items.push({ kind: "bundle", name: b.name, qty: l.qty, unit_price: price, contents: (b.bundle_items || []).map((i: any) => `${i.products?.name || "?"}${i.product_variants ? " " + i.product_variants.size_ml + "ml" : ""} × ${i.qty}`) });
    }
  }
  const { data, error } = await s.from("orders").insert({ customer_name: name, phone, city, address, notes, items, subtotal }).select("number").single();
  if (error || !data) return { ok: false, error: "We couldn't place your order. Please try again." };
  return { ok: true, number: Number(data.number), total: subtotal };
}
