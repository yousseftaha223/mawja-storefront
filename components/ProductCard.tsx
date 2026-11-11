import Link from "next/link";
import type { Product } from "@/lib/types";
import { img, money, unit } from "@/lib/utils";

export default function ProductCard({ p, cur }: { p: Product; cur: string }) {
  const vs = p.product_variants; const low = vs.length ? vs.reduce((a, b) => (unit(b) < unit(a) ? b : a)) : null;
  const sale = low && low.sale_price != null && low.sale_price < low.price;
  const [a, b] = p.product_images;
  return (
    <article className="pc">
      <Link href={`/product/${p.slug}`} className="im" aria-label={p.name}>
        {a && <img className="a" src={img(a.path)} alt={p.name} width={600} height={600} loading="lazy" />}
        {b && <img className="b" src={img(b.path)} alt="" width={600} height={600} loading="lazy" />}
        {!p.is_available && <span className="tag">Sold out</span>}
      </Link>
      <h3>{p.name}</h3>
      {p.reference_fragrance && <p className="ref">Inspired by {p.reference_fragrance}</p>}
      {low && (
        <p className="pr">
          {vs.length > 1 && "From "}{money(unit(low), cur)}
          {sale && <s>{money(low.price, cur)}</s>}
          <span className="sz"> · {vs.map((v) => `${v.size_ml}ml`).join(" / ")}</span>
        </p>
      )}
      <Link href={`/product/${p.slug}`} className="qa">View Product</Link>
    </article>
  );
}
