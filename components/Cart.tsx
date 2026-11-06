"use client";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import type { CartLine } from "@/lib/types";
import { money } from "@/lib/utils";
import { placeOrder } from "@/lib/actions/order";

type Ctx = { lines: CartLine[]; count: number; total: number; open: boolean; setOpen: (b: boolean) => void; add: (l: CartLine) => void; setQty: (k: string, q: number) => void; remove: (k: string) => void; clear: () => void; currency: string; note: string };
const C = createContext<Ctx>(null as any);
export const useCart = () => useContext(C);

export function CartProvider({ currency, note, children }: { currency: string; note: string; children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]); const [open, setOpen] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => { try { setLines(JSON.parse(localStorage.getItem("mawja-cart") || "[]")); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("mawja-cart", JSON.stringify(lines)); } catch {} }, [lines, ready]);
  const add = (l: CartLine) => { setLines((p) => p.some((x) => x.key === l.key) ? p.map((x) => x.key === l.key ? { ...x, qty: Math.min(20, x.qty + l.qty) } : x) : [...p, l]); setOpen(true); };
  const setQty = (k: string, q: number) => setLines((p) => q < 1 ? p.filter((x) => x.key !== k) : p.map((x) => x.key === k ? { ...x, qty: Math.min(20, q) } : x));
  const remove = (k: string) => setLines((p) => p.filter((x) => x.key !== k));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0), count = lines.reduce((s, l) => s + l.qty, 0);
  return <C.Provider value={{ lines, count, total, open, setOpen, add, setQty, remove, clear: () => setLines([]), currency, note }}>{children}</C.Provider>;
}

const inp = "w-full rounded-xl border border-mist/60 bg-white px-4 py-3 text-base outline-none focus:border-royal";

export function CartDrawer() {
  const { lines, total, open, setOpen, setQty, remove, clear, currency, note } = useCart();
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [pending, start] = useTransition(); const [err, setErr] = useState(""); const [done, setDone] = useState<{ number: number; total: number } | null>(null);
  const [f, setF] = useState({ name: "", phone: "", city: "", address: "", notes: "" });
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  const close = () => { setOpen(false); setTimeout(() => { if (step === "done") setStep("cart"); }, 300); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    start(async () => {
      const r = await placeOrder({ lines: lines.map((l) => ({ kind: l.kind, id: l.id, qty: l.qty })), customer: f });
      if (r.ok) { setDone({ number: r.number, total: r.total }); clear(); setStep("done"); } else setErr(r.error);
    });
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button aria-label="Close cart" className="absolute inset-0 bg-navy/60" onClick={close} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-mist/40 px-5 py-4">
          <h2 className="font-serif text-2xl">{step === "form" ? "Your details" : step === "done" ? "Order received" : "Your cart"}</h2>
          <button onClick={close} className="p-2 text-2xl leading-none" aria-label="Close">×</button>
        </div>
        {step === "done" && done ? (
          <div className="flex-1 space-y-4 p-6">
            <p className="font-serif text-3xl">Thank you.</p>
            <p>Your order <b>#{done.number}</b> ({money(done.total, currency)}) has been received. Our team will contact you to confirm it.</p>
            <button className="btn btn-navy" onClick={close}>Continue shopping</button>
          </div>
        ) : step === "form" ? (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto p-5">
            <div className="space-y-3">
              <input className={inp} placeholder="Full name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
              <input className={inp} placeholder="Phone number" required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
              <input className={inp} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
              <textarea className={inp} placeholder="Delivery address" required rows={3} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
              <textarea className={inp} placeholder="Notes (optional)" rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </div>
            {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <div className="mt-auto pt-5">
              <div className="mb-3 flex justify-between text-lg"><span>Total</span><b>{money(total, currency)}</b></div>
              <button className="btn btn-navy w-full" disabled={pending}>{pending ? "Sending…" : "Place order request"}</button>
              <button type="button" className="mt-2 w-full py-2 text-sm underline" onClick={() => setStep("cart")}>Back to cart</button>
              {note && <p className="mt-2 text-xs text-navy/60">{note}</p>}
            </div>
          </form>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-mist/40 overflow-y-auto px-5">
              {!lines.length && <li className="py-10 text-center text-navy/60">Your cart is empty.</li>}
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-4">
                  <img src={l.image} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-lg object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.name}</p><p className="text-navy/60">{l.label}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="h-8 w-8 rounded-full border border-mist" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease quantity">−</button>
                      <span className="w-5 text-center">{l.qty}</span>
                      <button className="h-8 w-8 rounded-full border border-mist" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase quantity">+</button>
                      <button className="ml-auto text-xs underline" onClick={() => remove(l.key)}>Remove</button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{money(l.price * l.qty, currency)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-mist/40 p-5">
              <div className="mb-3 flex justify-between text-lg"><span>Total</span><b>{money(total, currency)}</b></div>
              <button className="btn btn-navy w-full" disabled={!lines.length} onClick={() => setStep("form")}>Checkout</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
