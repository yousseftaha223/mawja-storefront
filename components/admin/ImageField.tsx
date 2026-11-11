"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { img } from "@/lib/utils";

export default function ImageField({ value, onChange, folder = "uploads" }: { value: string | null; onChange: (p: string) => void; folder?: string }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [local, setLocal] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) return setErr("Use a JPG, PNG or WebP image.");
    if (f.size > 6 * 1024 * 1024) return setErr("Image must be under 6 MB.");
    setErr(""); setLocal(URL.createObjectURL(f)); setBusy(true);
    const path = `${folder}/${crypto.randomUUID()}.${f.name.split(".").pop()?.toLowerCase() || "jpg"}`;
    const { error } = await supabaseBrowser().storage.from("media").upload(path, f, { cacheControl: "31536000", contentType: f.type });
    setBusy(false);
    if (error) { setErr(error.message); setLocal(""); return; }
    onChange(path);
  }
  const src = local || img(value);
  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-mist/60 bg-swan">{src && <img src={src} alt="" className="h-full w-full object-cover" />}</div>
      <div className="space-y-1 text-sm">
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pick} className="block max-w-[220px] text-xs" />
        {busy && <p className="text-navy/60">Uploading…</p>}
        {err && <p role="alert" className="text-red-600">{err}</p>}
        {!busy && local && !err && <p className="text-teal">Uploaded. Save to publish.</p>}
      </div>
    </div>
  );
}
