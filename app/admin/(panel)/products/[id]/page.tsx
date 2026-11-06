import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProduct({ params, searchParams }: { params: { id: string }; searchParams: { cat?: string } }) {
  let product = null;
  if (params.id !== "new") {
    const { data } = await supabaseServer().from("products").select("*, product_variants(*), product_images(*)").eq("id", params.id).maybeSingle();
    if (!data) notFound(); product = data;
  }
  return <div className="space-y-6"><h1 className="font-serif text-4xl">{product ? `Edit ${product.name}` : "New product"}</h1><ProductForm product={product} category={searchParams.cat === "women" ? "women" : "men"} /></div>;
}
