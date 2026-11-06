import { getBundles, getHero, getProducts, getPromo, getSettings } from "@/lib/data";
import { img, money, cx } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import BundleAdd from "@/components/BundleAdd";
import type { Product } from "@/lib/types";

export const revalidate = 60;
const btn = (u: string) => (u.startsWith("#") || u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" });

function Section({ id, title, text, products, cur }: { id: string; title: string; text: string; products: Product[]; cur: string }) {
  if (!products.length) return null;
  return (
    <section id={id} className="mx-auto max-w-7xl px-5 py-14 md:py-24">
      <div className="mb-8 max-w-xl md:mb-12"><h2 className="font-serif text-4xl md:text-6xl">{title}</h2><p className="mt-3 text-navy/70">{text}</p></div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-7 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} cur={cur} />)}</div>
    </section>
  );
}

export default async function Home() {
  const [hero, promo, men, women, bundles, settings] = await Promise.all([getHero(), getPromo(), getProducts("men"), getProducts("women"), getBundles(), getSettings()]);
  const cur = settings?.currency || "EGP";
  const promoImg = promo?.is_active && promo.image_path ? (
    <img src={img(promo.image_path)} alt={promo.alt_text || ""} width={1600} height={900} loading="lazy"
      style={{ ["--r" as any]: promo.ratio || "16/9" }} className="aspect-[4/5] w-full object-cover md:[aspect-ratio:var(--r)]" />
  ) : null;
  return (
    <>
      <section className="relative isolate bg-navy text-swan">
        <div className="relative flex min-h-[80svh] items-end md:min-h-[88vh]">
          {hero?.image_path && <img src={img(hero.image_path)} alt="" fetchPriority="high" width={1600} height={1600} className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/45 to-navy/5 md:bg-gradient-to-r md:from-navy/90 md:via-navy/35 md:to-transparent" />
          <div className="mx-auto w-full max-w-7xl px-5 pb-12 md:pb-24">
            <div className="max-w-xl">
              <h1 className="font-serif text-[2.9rem] font-medium leading-[1.02] md:text-7xl">{hero?.headline || "Find Your Signature Scent."}</h1>
              {hero?.description && <p className="mt-4 max-w-md text-base text-swan/85 md:text-lg">{hero.description}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                {hero?.cta_label && <a href={hero.cta_url || "#men"} className="btn btn-sand" {...btn(hero.cta_url || "#")}>{hero.cta_label}</a>}
                {hero?.cta2_label && <a href={hero.cta2_url || "#"} className="btn btn-line" {...btn(hero.cta2_url || "#")}>{hero.cta2_label}</a>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {promoImg && (promo.link_url ? <a href={promo.link_url} className="block">{promoImg}</a> : promoImg)}

      <Section id="men" title="For Him" text="Explore fragrances crafted for every side of his personality." products={men} cur={cur} />
      <Section id="women" title="For Her" text="Discover fragrances that express every mood, moment, and feeling." products={women} cur={cur} />

      {!!bundles.length && (
        <section id="bundles" className="bg-swan">
          <div className="mx-auto max-w-7xl px-5 py-14 md:py-24">
            <div className="mb-8 max-w-xl md:mb-12"><h2 className="font-serif text-4xl md:text-6xl">Special Bundles</h2><p className="mt-3 text-navy/70">Discover exclusive combinations and limited-time offers.</p></div>
            <div className={cx("grid gap-6", bundles.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1")}>
              {bundles.map((b) => (
                <article key={b.id} className={cx("overflow-hidden rounded-3xl bg-ivory", bundles.length === 1 && "md:grid md:grid-cols-2")}>
                  {b.image_path && <img src={img(b.image_path)} alt={b.name} width={800} height={800} loading="lazy" className="aspect-[4/3] h-full w-full object-cover md:aspect-auto md:min-h-[320px]" />}
                  <div className="flex flex-col justify-center gap-3 p-6 md:p-9">
                    <h3 className="font-serif text-3xl md:text-4xl">{b.name}</h3>
                    {b.description && <p className="text-navy/70">{b.description}</p>}
                    <ul className="text-sm text-navy/70">{b.bundle_items.map((i) => <li key={i.id}>{i.products?.name}{i.product_variants ? ` · ${i.product_variants.size_ml} ml` : ""}{i.qty > 1 ? ` × ${i.qty}` : ""}</li>)}</ul>
                    <p className="text-2xl"><b>{money(b.promo_price, cur)}</b>{b.original_price && b.original_price > b.promo_price && <s className="ml-3 text-base text-navy/50">{money(b.original_price, cur)}</s>}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-4">
                      <BundleAdd id={b.id} name={b.name} price={b.promo_price} image={img(b.image_path)} />
                      {b.link_url && <a href={b.link_url} className="text-sm underline underline-offset-4">Learn more</a>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
