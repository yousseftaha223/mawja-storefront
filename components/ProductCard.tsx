import Link from "next/link";
import type { Product } from "@/lib/types";
import { img, money, unit } from "@/lib/utils";

export default function ProductCard({ p, cur }: { p: Product; cur: string }) {
  const vs = p.product_variants; const low = vs.length ? vs.reduce((a, b) => (unit(b) < unit(a) ? b : a)) : null;
  const sale = low && low.sale_price != null && low.sale_price < low.price;
  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-swan">
        <img src={img(p.product_images[0]?.path)} alt={p.name} width={600} height={600} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        {!p.is_available && <span className="absolute left-3 top-3 rounded-full bg-navy px-3 py-1 text-xs text-swan">Sold out</span>}
      </div>
      <h3 className="mt-3 text-base font-medium md:text-lg">{p.name}</h3>
      {p.reference_fragrance && <p className="text-sm text-navy/60">Inspired by {p.reference_fragrance}</p>}
      {low && (
        <p className="mt-1 text-sm">
          {vs.length > 1 && "From "}<b>{money(unit(low), cur)}</b>
          {sale && <s className="ml-2 text-navy/50">{money(low.price, cur)}</s>}
          <span className="ml-2 text-navy/50">{vs.map((v) => `${v.size_ml}ml`).join(" · ")}</span>
        </p>
      )}
      <span className="mt-2 inline-block text-sm underline underline-offset-4">View Product</span>
    </Link>
  );
}
