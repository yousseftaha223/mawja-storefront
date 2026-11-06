import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct, getSettings } from "@/lib/data";
import { img } from "@/lib/utils";
import Gallery from "@/components/Gallery";
import AddToCart from "@/components/AddToCart";

export const revalidate = 60;
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProduct(params.slug); if (!p) return {};
  return { title: `${p.name} — MAWJA`, description: p.short_description || undefined, openGraph: { images: p.product_images[0] ? [img(p.product_images[0].path)] : [] } };
}
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [p, s] = await Promise.all([getProduct(params.slug), getSettings()]); if (!p) notFound();
  const images = p.product_images.map((i) => img(i.path));
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-2 md:gap-14 md:py-14">
      <Gallery images={images} alt={p.name} />
      <div className="space-y-6 md:pt-4">
        <div>
          <p className="text-sm text-navy/60">{p.category === "men" ? "For Him" : "For Her"}</p>
          <h1 className="font-serif text-5xl md:text-6xl">{p.name}</h1>
          {p.reference_fragrance && <p className="mt-2 text-navy/70">Inspired by {p.reference_fragrance}</p>}
        </div>
        <AddToCart productId={p.id} name={p.name} image={images[0] || ""} variants={p.product_variants} available={p.is_available} />
        {(p.full_description || p.short_description) && <p className="max-w-prose leading-relaxed text-navy/80">{p.full_description || p.short_description}</p>}
        {!!p.notes.length && <div><h2 className="mb-1 font-medium">Fragrance notes</h2><p className="text-navy/80">{p.notes.join(", ")}</p></div>}
        {s?.order_note && <p className="text-xs text-navy/50">{s.order_note}</p>}
      </div>
    </div>
  );
}
