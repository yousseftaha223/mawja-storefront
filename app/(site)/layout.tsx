import Link from "next/link";
import { getAnnouncement, getFooter, getSettings } from "@/lib/data";
import { CartDrawer, CartProvider } from "@/components/Cart";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const revalidate = 60;
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [a, f, s] = await Promise.all([getAnnouncement(), getFooter(), getSettings()]);
  const bar = a && (
    <div className="ann" aria-label="Announcement">
      <div className="track">
        {[0, 1].map((g) => (
          <div className="grp" key={g} aria-hidden={g === 1}>
            {Array.from({ length: 4 }).map((_, i) => <span key={i}>{a.text}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="site">
      <CartProvider currency={s?.currency || "EGP"} note={s?.order_note || ""}>
        {a && (a.link_url ? <Link href={a.link_url} className="block">{bar}</Link> : bar)}
        <Header />
        <main>{children}</main>
        <Footer f={f} />
        <CartDrawer />
      </CartProvider>
    </div>
  );
}
