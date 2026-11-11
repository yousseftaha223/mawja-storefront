import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { SINGLETONS } from "@/lib/config";
import ConfigForm from "@/components/admin/ConfigForm";

export default async function Content({ params }: { params: { table: string } }) {
  const cfg = SINGLETONS[params.table]; if (!cfg) notFound();
  const { data } = await supabaseServer().from(params.table).select("*").eq("id", 1).maybeSingle();
  return (
    <div className="space-y-6">
      <div><h1 className="font-serif text-4xl">{cfg.title}</h1><p className="text-navy/60">{cfg.intro}</p></div>
      {!data && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">No row found. Run supabase/seed.sql (or insert row id=1) first.</p>}
      {data && <ConfigForm table={params.table} fields={cfg.fields} row={data} preview={cfg.preview} />}
    </div>
  );
}
