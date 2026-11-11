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
    <div className="pp">
      <Gallery images={images} alt={p.name} />
      <div>
        <p className="fine-txt">{p.category === "men" ? "For Him" : p.category === "women" ? "For Her" : "Unisex"}</p>
        <h1>{p.name}</h1>
        {p.reference_fragrance && <p className="serif mt-2 text-2xl italic opacity-75">Inspired by {p.reference_fragrance}</p>}
        <AddToCart productId={p.id} name={p.name} image={images[0] || ""} variants={p.product_variants} available={p.is_available} />
        {(p.full_description || p.short_description) && <p className="mt-8 max-w-prose leading-relaxed opacity-85">{p.full_description || p.short_description}</p>}
        {!!p.notes.length && <div className="mt-6"><h2 className="opt-label">Fragrance notes</h2><p>{p.notes.join(", ")}</p></div>}
        {s?.order_note && <p className="fine-txt mt-6">{s.order_note}</p>}
      </div>
    </div>
  );
}
