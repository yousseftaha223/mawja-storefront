"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBundle } from "@/lib/actions/admin";
import ImageField from "./ImageField";
import { Btn, Field, Notice, inputCls } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function BundleForm({ bundle, products }: { bundle: any | null; products: any[] }) {
  const r = useRouter(); const [pending, start] = useTransition(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [b, setB] = useState<any>(() => bundle ? { ...bundle, starts_at: "", ends_at: "", items: bundle.bundle_items.map((i: any) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })) }
    : { name: "", description: "", image_path: "", promo_price: "", original_price: "", link_url: "", starts_at: "", ends_at: "", status: "draft", items: [{ product_id: "", variant_id: "", qty: 1 }] });
  useEffect(() => { if (bundle) setB((s: any) => ({ ...s, starts_at: toLocal(bundle.starts_at), ends_at: toLocal(bundle.ends_at) })); }, []); // eslint-disable-line
  const set = (k: string, x: any) => setB((s: any) => ({ ...s, [k]: x }));
  const setItem = (i: number, patch: any) => set("items", b.items.map((it: any, n: number) => n === i ? { ...it, ...patch } : it));
  const num = (x: any) => (x === "" || x == null ? null : Number(x));
  function submit(status: string) {
    setMsg(null);
    const out = { ...b, status, promo_price: num(b.promo_price), original_price: num(b.original_price), starts_at: b.starts_at ? new Date(b.starts_at).toISOString() : null, ends_at: b.ends_at ? new Date(b.ends_at).toISOString() : null };
    delete out.bundle_items;
    start(async () => { const res = await saveBundle(out); if (res.ok) { r.push("/admin/bundles"); r.refresh(); } else setMsg({ ok: false, t: res.error || "Could not save." }); });
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(b.status === "published" ? "published" : "draft"); }} className="max-w-3xl space-y-6">
      <Field label="Bundle name"><input required className={inputCls} value={b.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Description"><textarea rows={3} className={inputCls} value={b.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="space-y-1.5"><p className="text-sm font-medium">Promotional image</p><ImageField value={b.image_path} folder="bundles" onChange={(p) => set("image_path", p)} /></div>
      <fieldset className="space-y-3"><legend className="mb-1 text-sm font-medium">Included products</legend>
        {b.items.map((it: any, i: number) => {
          const prod = products.find((p) => p.id === it.product_id);
          return (
            <div key={i} className="grid grid-cols-[2fr_1.2fr_.7fr_auto] items-end gap-2">
              <Field label="Product"><select className={inputCls} value={it.product_id} onChange={(e) => setItem(i, { product_id: e.target.value, variant_id: "" })}><option value="">Select…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Size"><select className={inputCls} value={it.variant_id || ""} onChange={(e) => setItem(i, { variant_id: e.target.value })}><option value="">Any</option>{(prod?.product_variants || []).map((v: any) => <option key={v.id} value={v.id}>{v.size_ml} ml</option>)}</select></Field>
              <Field label="Qty"><input type="number" min="1" className={inputCls} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></Field>
              <button type="button" className="mb-1 px-2 py-2 text-sm text-red-600" onClick={() => set("items", b.items.filter((_: any, n: number) => n !== i))} aria-label="Remove">✕</button>
            </div>
          );
        })}
        <button type="button" className="text-sm underline" onClick={() => set("items", [...b.items, { product_id: "", variant_id: "", qty: 1 }])}>+ Add product</button>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Promotional price"><input type="number" min="0" step="0.01" className={inputCls} value={b.promo_price ?? ""} onChange={(e) => set("promo_price", e.target.value)} /></Field>
        <Field label="Original combined price (optional)"><input type="number" min="0" step="0.01" className={inputCls} value={b.original_price ?? ""} onChange={(e) => set("original_price", e.target.value)} /></Field>
        <Field label="Starts at (optional)"><input type="datetime-local" className={inputCls} value={b.starts_at} onChange={(e) => set("starts_at", e.target.value)} /></Field>
        <Field label="Ends at (optional)"><input type="datetime-local" className={inputCls} value={b.ends_at} onChange={(e) => set("ends_at", e.target.value)} /></Field>
      </div>
      <Field label="Destination link (optional)"><input className={inputCls} value={b.link_url || ""} onChange={(e) => set("link_url", e.target.value)} placeholder="https://… or #men" /></Field>
      <Notice m={msg} />
      <div className="flex flex-wrap gap-3">
        <Btn type="button" disabled={pending} onClick={() => submit("published")}>{pending ? "Saving…" : "Save & publish"}</Btn>
        <Btn type="button" disabled={pending} className="!bg-transparent !text-navy border border-navy hover:!bg-swan" onClick={() => submit("draft")}>Save as draft</Btn>
      </div>
    </form>
  );
}
