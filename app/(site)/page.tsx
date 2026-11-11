import { getBundles, getHero, getProducts, getPromo, getSettings } from "@/lib/data";
import { img, money } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import BundleAdd from "@/components/BundleAdd";
import type { Product } from "@/lib/types";

export const revalidate = 60;
const ext = (u: string) => (u.startsWith("#") || u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" });

function Section({ id, title, text, products, cur, alt }: { id: string; title: string; text: string; products: Product[]; cur: string; alt?: boolean }) {
  if (!products.length) return null;
  return (
    <section id={id} className={`sec${alt ? " alt" : ""}`}>
      <div className="sec-in">
        <div className="sec-head"><h2>{title}</h2><p className="sub">{text}</p></div>
        <div className="pgrid">{products.map((p) => <ProductCard key={p.id} p={p} cur={cur} />)}</div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [hero, promo, men, women, unisex, bundles, settings] = await Promise.all([getHero(), getPromo(), getProducts("men"), getProducts("women"), getProducts("unisex"), getBundles(), getSettings()]);
  const cur = settings?.currency || "EGP";
  const promoImg = promo?.is_active && promo.image_path ? <img className="macro" src={img(promo.image_path)} alt={promo.alt_text || ""} width={1600} height={900} loading="lazy" /> : null;
  return (
    <>
      <section className="hero2">
        <div className="hero-in">
          <div className="ph">{hero?.image_path && <img src={img(hero.image_path)} alt="" fetchPriority="high" width={1000} height={1000} />}</div>
          <div>
            <p className="kicker">MAWJA · موجة</p>
            <h1>{hero?.headline || "Find Your Signature Scent."}</h1>
            {hero?.description && <p className="lede">{hero.description}</p>}
            <div className="ctas">
              {hero?.cta_label && <a href={hero.cta_url || "#men"} className="sbtn sbtn-sand" {...ext(hero.cta_url || "#")}>{hero.cta_label}</a>}
              {hero?.cta2_label && <a href={hero.cta2_url || "#"} className="sbtn sbtn-line" {...ext(hero.cta2_url || "#")}>{hero.cta2_label}</a>}
            </div>
          </div>
        </div>
      </section>

      {promoImg && (promo.link_url ? <a href={promo.link_url} className="block" {...ext(promo.link_url)}>{promoImg}</a> : promoImg)}

      <nav className="strip" aria-label="Collections">
        {!!men.length && <a href="#men">For Him</a>}
        {!!women.length && <a href="#women">For Her</a>}
        {!!unisex.length && <a href="#unisex">Unisex</a>}
        {!!bundles.length && <a href="#bundles">Bundles</a>}
      </nav>

      <Section id="men" title="For Him" text="Explore fragrances crafted for every side of his personality." products={men} cur={cur} />
      <Section id="women" title="For Her" text="Discover fragrances that express every mood, moment, and feeling." products={women} cur={cur} alt />
      <Section id="unisex" title="Unisex" text="Fragrances made to be worn and loved by everyone." products={unisex} cur={cur} />

      {!!bundles.length && (
        <section id="bundles" className="sec">
          <div className="sec-in">
            <div className="sec-head"><h2>Special Bundles</h2><p className="sub">Discover exclusive combinations and limited-time offers.</p></div>
            <div className="grid gap-6" style={{ gridTemplateColumns: bundles.length > 1 ? "repeat(auto-fit,minmax(300px,1fr))" : "1fr" }}>
              {bundles.map((b) => (
                <article key={b.id} className={`bund${bundles.length === 1 ? " one" : ""}`}>
                  {b.image_path && <img src={img(b.image_path)} alt={b.name} width={800} height={800} loading="lazy" />}
                  <div className="body">
                    <h3>{b.name}</h3>
                    {b.description && <p className="opacity-80">{b.description}</p>}
                    <ul className="text-sm opacity-80">{b.bundle_items.map((i) => <li key={i.id}>{i.products?.name}{i.product_variants ? ` · ${i.product_variants.size_ml} ml` : ""}{i.qty > 1 ? ` × ${i.qty}` : ""}</li>)}</ul>
                    <p className="text-2xl font-medium">{money(b.promo_price, cur)}{b.original_price && b.original_price > b.promo_price && <s className="ml-3 text-base font-normal opacity-55">{money(b.original_price, cur)}</s>}</p>
                    <div className="flex flex-wrap items-center gap-4">
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
