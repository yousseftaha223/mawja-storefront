"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/lib/actions/admin";
import ImageField from "./ImageField";
import { Btn, Field, Notice, inputCls } from "./ui";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export default function ProductForm({ product, category }: { product: any | null; category: string }) {
  const r = useRouter(); const [pending, start] = useTransition(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [p, setP] = useState<any>(() => product ? {
    ...product, notes: (product.notes || []).join(", "),
    variants: [...product.product_variants].sort((a: any, b: any) => a.size_ml - b.size_ml),
    images: [...product.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any) => i.path),
  } : { name: "", slug: "", category, short_description: "", full_description: "", reference_fragrance: "", notes: "", is_available: true, is_featured: false, status: "draft", variants: [{ size_ml: 55, price: "", sale_price: "" }], images: [""] });
  const set = (k: string, x: any) => setP((s: any) => ({ ...s, [k]: x }));
  const setVar = (i: number, k: string, x: any) => set("variants", p.variants.map((v: any, n: number) => n === i ? { ...v, [k]: x } : v));
  const num = (x: any) => (x === "" || x == null ? null : Number(x));
  function submit(status?: string) {
    setMsg(null);
    const out = { ...p, status: status || p.status, notes: String(p.notes).split(",").map((s) => s.trim()).filter(Boolean), images: p.images.filter(Boolean),
      variants: p.variants.map((v: any) => ({ id: v.id, size_ml: num(v.size_ml), price: num(v.price), sale_price: num(v.sale_price) })) };
    delete out.product_variants; delete out.product_images;
    start(async () => { const res = await saveProduct(out); if (res.ok) { setMsg({ ok: true, t: "Saved." }); r.push(`/admin/products?cat=${p.category}`); r.refresh(); } else setMsg({ ok: false, t: res.error || "Could not save." }); });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="max-w-3xl space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Product name"><input required className={inputCls} value={p.name} onChange={(e) => { set("name", e.target.value); if (!product && (!p.slug || p.slug === slugify(p.name))) set("slug", slugify(e.target.value)); }} /></Field>
        <Field label="Slug (URL)" hint="Lowercase letters, numbers, dashes"><input required className={inputCls} value={p.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Category"><select className={inputCls} value={p.category} onChange={(e) => set("category", e.target.value)}><option value="men">Men’s</option><option value="women">Women’s</option></select></Field>
        <Field label="Original / reference fragrance"><input className={inputCls} value={p.reference_fragrance || ""} onChange={(e) => set("reference_fragrance", e.target.value)} /></Field>
      </div>
      <Field label="Short description"><input className={inputCls} value={p.short_description || ""} onChange={(e) => set("short_description", e.target.value)} /></Field>
      <Field label="Full description"><textarea rows={4} className={inputCls} value={p.full_description || ""} onChange={(e) => set("full_description", e.target.value)} /></Field>
      <Field label="Fragrance notes" hint="Separate with commas"><input className={inputCls} value={p.notes} onChange={(e) => set("notes", e.target.value)} /></Field>

      <fieldset className="space-y-3"><legend className="mb-1 text-sm font-medium">Sizes & prices</legend>
        {p.variants.map((v: any, i: number) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <Field label="Size (ml)"><input type="number" min="1" className={inputCls} value={v.size_ml ?? ""} onChange={(e) => setVar(i, "size_ml", e.target.value)} /></Field>
            <Field label="Price"><input type="number" min="0" step="0.01" className={inputCls} value={v.price ?? ""} onChange={(e) => setVar(i, "price", e.target.value)} /></Field>
            <Field label="Sale price"><input type="number" min="0" step="0.01" className={inputCls} value={v.sale_price ?? ""} onChange={(e) => setVar(i, "sale_price", e.target.value)} /></Field>
            <button type="button" className="mb-1 px-2 py-2 text-sm text-red-600" onClick={() => set("variants", p.variants.filter((_: any, n: number) => n !== i))} aria-label="Remove size">✕</button>
          </div>
        ))}
        <button type="button" className="text-sm underline" onClick={() => set("variants", [...p.variants, { size_ml: "", price: "", sale_price: "" }])}>+ Add size</button>
      </fieldset>

      <fieldset className="space-y-3"><legend className="mb-1 text-sm font-medium">Images (first image is the main one)</legend>
        {p.images.map((path: string, i: number) => (
          <div key={i} className="flex items-center gap-3"><ImageField value={path} folder="products" onChange={(x) => set("images", p.images.map((o: string, n: number) => n === i ? x : o))} />
            <button type="button" className="text-sm text-red-600" onClick={() => set("images", p.images.filter((_: any, n: number) => n !== i))}>Remove</button></div>
        ))}
        <button type="button" className="text-sm underline" onClick={() => set("images", [...p.images, ""])}>+ Add image</button>
      </fieldset>

      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={p.is_available} onChange={(e) => set("is_available", e.target.checked)} />In stock</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />Featured</label>
        <span>Status: <b>{p.status}</b></span>
      </div>
      <Notice m={msg} />
      <div className="flex flex-wrap gap-3">
        <Btn type="button" disabled={pending} onClick={() => submit("published")}>{pending ? "Saving…" : "Save & publish"}</Btn>
        <Btn type="button" disabled={pending} className="!bg-transparent !text-navy border border-navy hover:!bg-swan" onClick={() => submit("draft")}>Save as draft</Btn>
      </div>
    </form>
  );
}
