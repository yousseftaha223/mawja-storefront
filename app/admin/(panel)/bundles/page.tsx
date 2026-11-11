import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { img, money, cx } from "@/lib/utils";
import RowActions from "@/components/admin/RowActions";

export default async function Bundles() {
  const sb = supabaseServer();
  const [{ data: bundles }, { data: s }] = await Promise.all([sb.from("bundles").select("*").order("sort_order"), sb.from("site_settings").select("currency").maybeSingle()]);
  const now = Date.now();
  const state = (b: any) => b.status !== "published" ? "draft" : b.starts_at && new Date(b.starts_at).getTime() > now ? "scheduled" : b.ends_at && new Date(b.ends_at).getTime() < now ? "expired" : "live";
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-4xl">Promotional Bundles</h1><p className="text-navy/60">The section appears on the site only while at least one bundle is live.</p></div>
        <Link href="/admin/bundles/new" className="rounded-full bg-navy px-5 py-2.5 text-sm text-swan">+ New bundle</Link>
      </div>
      {!bundles?.length && <p className="rounded-xl bg-swan p-6 text-navy/70">No bundles yet.</p>}
      <ul className="space-y-3">
        {bundles?.map((b: any) => (
          <li key={b.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-mist/50 bg-white p-4">
            <img src={img(b.image_path)} alt="" className="h-16 w-16 rounded-lg bg-swan object-cover" />
            <div className="min-w-[140px] flex-1"><p className="font-medium">{b.name}</p><p className="text-xs text-navy/60">{money(b.promo_price, s?.currency || "EGP")}</p>
              <p className="mt-1 text-xs"><span className={cx("rounded-full px-2 py-0.5", state(b) === "live" ? "bg-teal/10 text-teal" : "bg-mist/30")}>{state(b)}</span></p></div>
            <RowActions table="bundles" id={b.id} status={b.status} name={b.name} editHref={`/admin/bundles/${b.id}`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
