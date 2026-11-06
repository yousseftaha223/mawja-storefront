import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { img, money, unit, cx } from "@/lib/utils";
import RowActions from "@/components/admin/RowActions";

export default async function Products({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = searchParams.cat === "women" ? "women" : "men";
  const sb = supabaseServer();
  const [{ data: products }, { data: s }] = await Promise.all([
    sb.from("products").select("*, product_variants(*), product_images(*)").eq("category", cat).order("sort_order"), sb.from("site_settings").select("currency").maybeSingle()]);
  const cur = s?.currency || "EGP";
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-4xl">{cat === "men" ? "Men’s" : "Women’s"} Fragrances</h1>
        <Link href={`/admin/products/new?cat=${cat}`} className="rounded-full bg-navy px-5 py-2.5 text-sm text-swan">+ Add product</Link>
      </div>
      <div className="flex gap-2 text-sm">{["men", "women"].map((c) => <Link key={c} href={`/admin/products?cat=${c}`} className={cx("rounded-full border px-4 py-1.5", c === cat ? "border-navy bg-navy text-swan" : "border-mist")}>{c === "men" ? "Men’s" : "Women’s"}</Link>)}</div>
      {!products?.length && <p className="rounded-xl bg-swan p-6 text-navy/70">No products in this category yet.</p>}
      <ul className="space-y-3">
        {products?.map((p: any) => {
          const vs = [...p.product_variants].sort((a: any, b: any) => a.size_ml - b.size_ml); const first = [...p.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-mist/50 bg-white p-4">
              <img src={img(first?.path)} alt="" className="h-16 w-16 rounded-lg bg-swan object-cover" />
              <div className="min-w-[140px] flex-1"><p className="font-medium">{p.name}</p>
                <p className="text-xs text-navy/60">{vs.map((v: any) => `${v.size_ml}ml ${money(unit(v), cur)}`).join(" · ")}</p>
                <p className="mt-1 text-xs"><span className={cx("rounded-full px-2 py-0.5", p.status === "published" ? "bg-teal/10 text-teal" : "bg-mist/30")}>{p.status}</span>{!p.is_available && <span className="ml-2 text-red-600">out of stock</span>}</p></div>
              <RowActions table="products" id={p.id} status={p.status} name={p.name} editHref={`/admin/products/${p.id}`} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
