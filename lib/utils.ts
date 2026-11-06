export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
/** Accepts a full URL, a /public path (demo data), or a Supabase Storage path in the "media" bucket. */
export function img(p?: string | null) {
  if (!p) return "";
  if (/^(https?:)?\/\//.test(p) || p.startsWith("/")) return p;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${p}`;
}
export const money = (n: number, cur = "EGP") => `${cur} ${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
export const unit = (v: { price: number; sale_price: number | null }) => (v.sale_price != null && v.sale_price < v.price ? v.sale_price : v.price);
export const inWindow = (s?: string | null, e?: string | null, now = Date.now()) =>
  (!s || new Date(s).getTime() <= now) && (!e || new Date(e).getTime() >= now);
