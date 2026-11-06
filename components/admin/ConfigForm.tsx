"use client";
import { useEffect, useState, useTransition } from "react";
import { saveSingleton } from "@/lib/actions/admin";
import { PALETTE, type F } from "@/lib/config";
import ImageField from "./ImageField";
import { Btn, Field, Notice, inputCls } from "./ui";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function ConfigForm({ table, fields, row, preview }: { table: string; fields: F[]; row: any; preview?: "announcement" }) {
  const [v, setV] = useState<Record<string, any>>(() => Object.fromEntries(fields.map((f) => [f.name, f.type === "datetime" ? "" : row?.[f.name] ?? (f.type === "checkbox" ? false : "")])));
  const [pending, start] = useTransition(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { setV((s) => ({ ...s, ...Object.fromEntries(fields.filter((f) => f.type === "datetime").map((f) => [f.name, toLocal(row?.[f.name])])) })); }, []); // eslint-disable-line
  const set = (k: string, x: any) => setV((s) => ({ ...s, [k]: x }));
  function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    const miss = fields.find((f) => f.required && !v[f.name]); if (miss) return setMsg({ ok: false, t: `${miss.label} is required.` });
    const out = { ...v }; fields.forEach((f) => { if (f.type === "datetime") out[f.name] = v[f.name] ? new Date(v[f.name]).toISOString() : null; });
    start(async () => { const r = await saveSingleton(table, out); setMsg(r.ok ? { ok: true, t: "Saved. Your changes are live on the website." } : { ok: false, t: r.error || "Could not save." }); });
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      {preview === "announcement" && (
        <div><p className="mb-1.5 text-sm font-medium">Preview</p>
          <div className="rounded-lg px-4 py-2.5 text-center text-sm" style={{ background: v.bg_color || "#101F3A", color: v.text_color || "#F5EEE4" }}>{v.text || "Your announcement text"}</div></div>
      )}
      {fields.map((f) => (
        <div key={f.name}>
          {f.type === "checkbox" ? (
            <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-5 w-5" checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} />{f.label}</label>
          ) : f.type === "image" ? (
            <div className="space-y-1.5"><p className="text-sm font-medium">{f.label}</p><ImageField value={v[f.name]} onChange={(p) => set(f.name, p)} folder={table} /></div>
          ) : (
            <Field label={f.label} hint={f.hint}>
              {f.type === "textarea" ? <textarea rows={3} className={inputCls} value={v[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />
                : f.type === "color" ? <select className={inputCls} value={v[f.name] || ""} onChange={(e) => set(f.name, e.target.value)}>{PALETTE.map((p) => <option key={p.hex} value={p.hex}>{p.name} ({p.hex})</option>)}</select>
                : f.type === "select" ? <select className={inputCls} value={v[f.name] || ""} onChange={(e) => set(f.name, e.target.value)}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input className={inputCls} type={f.type === "datetime" ? "datetime-local" : "text"} value={v[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />}
            </Field>
          )}
        </div>
      ))}
      <Notice m={msg} />
      <Btn disabled={pending}>{pending ? "Saving…" : "Save & publish"}</Btn>
    </form>
  );
}
