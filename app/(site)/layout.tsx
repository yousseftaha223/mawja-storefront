import Link from "next/link";
import { getAnnouncement, getFooter, getSettings } from "@/lib/data";
import { CartDrawer, CartProvider } from "@/components/Cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const revalidate = 60;
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [a, f, s] = await Promise.all([getAnnouncement(), getFooter(), getSettings()]);
  const bar = a && (
    <div className="px-4 py-2.5 text-center text-sm" style={{ background: a.bg_color || "#101F3A", color: a.text_color || "#F5EEE4" }}>{a.text}</div>
  );
  return (
    <CartProvider currency={s?.currency || "EGP"} note={s?.order_note || ""}>
      {a && (a.link_url ? <Link href={a.link_url} className="block">{bar}</Link> : bar)}
      <Header />
      <main>{children}</main>
      <Footer f={f} />
      <CartDrawer />
    </CartProvider>
  );
}
