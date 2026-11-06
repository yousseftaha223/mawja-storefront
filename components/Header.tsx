"use client";
import Link from "next/link";
import { useCart } from "./Cart";

export default function Header() {
  const { count, setOpen } = useCart();
  const nav = [["Home", "/"], ["Men’s Fragrances", "/#men"], ["Women’s Fragrances", "/#women"]];
  return (
    <header className="sticky top-0 z-40 border-b border-mist/40 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-8 px-5 py-3">
        <Link href="/" aria-label="Mawja home"><img src="/brand/mawja-logo.png" alt="Mawja" width={988} height={155} className="h-7 w-auto md:h-8" /></Link>
        <nav aria-label="Main" className="order-3 flex w-full justify-center gap-6 pt-3 text-sm md:order-none md:w-auto md:pt-0 md:text-[15px]">
          {nav.map(([l, h]) => <Link key={l} href={h} className="hover:text-royal">{l}</Link>)}
        </nav>
        <button onClick={() => setOpen(true)} className="relative p-2" aria-label={`Open cart, ${count} items`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-royal px-1 text-[11px] text-white">{count}</span>}
        </button>
      </div>
    </header>
  );
}
