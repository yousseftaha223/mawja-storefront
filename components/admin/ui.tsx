import { cx } from "@/lib/utils";
export const inputCls = "w-full rounded-lg border border-mist/70 bg-white px-3 py-2.5 text-sm outline-none focus:border-royal";
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block text-xs text-navy/50">{hint}</span>}</label>;
}
export function Notice({ m }: { m: { ok: boolean; t: string } | null }) {
  if (!m) return null;
  return <p role={m.ok ? "status" : "alert"} className={cx("rounded-lg px-4 py-3 text-sm", m.ok ? "bg-teal/10 text-teal" : "bg-red-50 text-red-700")}>{m.t}</p>;
}
export const Btn = ({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button {...p} className={cx("rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-swan hover:bg-royal disabled:opacity-50", className)} />;
