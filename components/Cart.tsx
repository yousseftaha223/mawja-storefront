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

export function CartDrawer() {
  const { lines, total, open, setOpen, setQty, remove, clear, currency, note } = useCart();
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [pending, start] = useTransition(); const [err, setErr] = useState(""); const [done, setDone] = useState<{ number: number; total: number } | null>(null);
  const [f, setF] = useState({ name: "", phone: "", city: "", address: "", notes: "" });
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => { if (open && step === "form" && !lines.length) setStep("cart"); }, [open, step, lines.length]);
  const close = () => { setOpen(false); setErr(""); setTimeout(() => { if (step === "done") setStep("cart"); }, 300); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    start(async () => {
      const r = await placeOrder({ lines: lines.map((l) => ({ kind: l.kind, id: l.id, qty: l.qty })), customer: f });
      if (r.ok) { setDone({ number: r.number, total: r.total }); clear(); setStep("done"); setF({ name: "", phone: "", city: "", address: "", notes: "" }); } else setErr(r.error);
    });
  };
  if (!open) return null;
  const title = step === "form" ? "Your details" : step === "done" ? "Order received" : "Your cart";
  return (
    <div className="ov" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button aria-label="Close cart" className="scrim" onClick={close} />
      <aside className="panel panel-r">
        <div className="phead">
          <h2>{title}</h2>
          <button onClick={close} className="ib" aria-label="Close">✕</button>
        </div>
        {step === "done" && done ? (
          <div className="pbody" style={{ paddingTop: 24 }}>
            <p className="serif" style={{ fontSize: 40, lineHeight: 1.05 }}>Thank you.</p>
            <p style={{ marginTop: 14 }}>Your order <b>#{done.number}</b> ({money(done.total, currency)}) has been received. Our team will contact you on your phone number to confirm it.</p>
            <button className="sbtn sbtn-sand" style={{ marginTop: 24 }} onClick={close}>Continue shopping</button>
          </div>
        ) : step === "form" ? (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
            <div className="pbody" style={{ paddingTop: 18 }}>
              <label className="flabel" htmlFor="c-name">Full name *</label>
              <input id="c-name" className="field" required maxLength={100} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
              <label className="flabel" htmlFor="c-phone">Phone number *</label>
              <input id="c-phone" className="field" required inputMode="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
              <label className="flabel" htmlFor="c-city">City / Governorate</label>
              <input id="c-city" className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} autoComplete="address-level2" />
              <label className="flabel" htmlFor="c-addr">Delivery address *</label>
              <textarea id="c-addr" className="field" required rows={3} maxLength={300} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} autoComplete="street-address" />
              <label className="flabel" htmlFor="c-notes">Notes (optional)</label>
              <textarea id="c-notes" className="field" rows={2} maxLength={500} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
              <p className="flabel" style={{ marginTop: 8 }}>Order summary</p>
              <ul className="osum">
                {lines.map((l) => <li key={l.key}><span>{l.qty} × {l.name} <span className="fine-txt">{l.label}</span></span><span>{money(l.price * l.qty, currency)}</span></li>)}
              </ul>
              {err && <p role="alert" className="err">{err}</p>}
            </div>
            <div className="pfoot">
              <div className="sum"><span>Total</span><span>{money(total, currency)}</span></div>
              <button className="sbtn sbtn-sand sbtn-block" disabled={pending || !lines.length}>{pending ? "Sending…" : "Place order request"}</button>
              <button type="button" className="mt-2 w-full py-2 text-sm underline" onClick={() => setStep("cart")}>Back to cart</button>
              {note && <p className="fine-txt" style={{ marginTop: 8 }}>{note}</p>}
            </div>
          </form>
        ) : (
          <>
            <div className="pbody">
              {!lines.length && <p className="py-10 text-center opacity-70">Your cart is empty.</p>}
              {lines.map((l) => (
                <div key={l.key} className="cl">
                  <img src={l.image} alt="" width={72} height={72} />
                  <div>
                    <p className="nm">{l.name}</p><p className="fine-txt">{l.label}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="qty">
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease quantity">−</button>
                        <span>{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase quantity">+</button>
                      </div>
                      <button className="ml-1 text-[13px] underline" onClick={() => remove(l.key)}>Remove</button>
                    </div>
                  </div>
                  <p className="whitespace-nowrap text-[15px] font-medium">{money(l.price * l.qty, currency)}</p>
                </div>
              ))}
            </div>
            <div className="pfoot">
              <div className="sum"><span>Subtotal</span><span>{money(total, currency)}</span></div>
              <button className="sbtn sbtn-sand sbtn-block" disabled={!lines.length} onClick={() => setStep("form")}>Checkout</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
