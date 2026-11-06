import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import BundleForm from "@/components/admin/BundleForm";

export default async function EditBundle({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: products } = await sb.from("products").select("id,name,product_variants(id,size_ml)").order("name");
  let bundle = null;
  if (params.id !== "new") {
    const { data } = await sb.from("bundles").select("*, bundle_items(*)").eq("id", params.id).maybeSingle();
    if (!data) notFound(); bundle = data;
  }
  return <div className="space-y-6"><h1 className="font-serif text-4xl">{bundle ? `Edit ${bundle.name}` : "New bundle"}</h1><BundleForm bundle={bundle} products={products || []} /></div>;
}
