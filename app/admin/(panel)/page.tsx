import { supabaseServer } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import OrderStatus from "@/components/admin/OrderStatus";

export default async function Orders() {
  const sb = supabaseServer();
  const [{ data: orders }, { data: s }] = await Promise.all([sb.from("orders").select("*").order("created_at", { ascending: false }).limit(100), sb.from("site_settings").select("currency").maybeSingle()]);
  const cur = s?.currency || "EGP"; const fresh = (orders || []).filter((o: any) => o.status === "new").length;
  return (
    <div className="max-w-4xl space-y-6">
      <div><h1 className="font-serif text-4xl">Orders</h1><p className="text-navy/60">{fresh} new · {(orders || []).length} shown. Customers place order requests; payment is arranged by your team.</p></div>
      {!orders?.length && <p className="rounded-xl bg-swan p-6 text-navy/70">No orders yet. New orders from the website will appear here.</p>}
      {orders?.map((o: any) => (
        <article key={o.id} className="space-y-3 rounded-2xl border border-mist/50 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-lg font-medium">#{o.number} · {o.customer_name}</p><p className="text-sm text-navy/60">{new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}</p></div>
            <OrderStatus id={o.id} status={o.status} />
          </div>
          <p className="text-sm"><a className="underline" href={`tel:${o.phone}`}>{o.phone}</a> · <a className="underline" href={`https://wa.me/${String(o.phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a><br />{[o.city, o.address].filter(Boolean).join(" — ")}{o.notes && <><br /><i>Note: {o.notes}</i></>}</p>
          <ul className="divide-y divide-mist/30 text-sm">
            {o.items.map((i: any, n: number) => (
              <li key={n} className="flex justify-between py-1.5"><span>{i.qty} × {i.name}{i.size_ml ? ` ${i.size_ml}ml` : ""}{i.contents && <span className="block text-xs text-navy/50">{i.contents.join(" + ")}</span>}</span><span>{money(i.unit_price * i.qty, cur)}</span></li>
            ))}
          </ul>
          <p className="text-right font-medium">Total {money(o.subtotal, cur)}</p>
        </article>
      ))}
    </div>
  );
}
