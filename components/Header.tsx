"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./Cart";

const NAV: [string, string][] = [["Home", "/"], ["Men’s Fragrances", "/#men"], ["Women’s Fragrances", "/#women"], ["Unisex Fragrances", "/#unisex"]];

export default function Header() {
  const { count, setOpen } = useCart();
  const [sc, setSc] = useState(false); const [menu, setMenu] = useState(false);
  useEffect(() => { const f = () => setSc(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  return (
    <>
      <header className={`hdr${sc ? " sc" : ""}`}>
        <div className="hdr-in">
          <div className="flex items-center">
            <button className="ib menu-b" aria-label="Menu" onClick={() => setMenu(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 8h18M3 16h18" /></svg>
            </button>
            <nav className="nav" aria-label="Main">{NAV.map(([l, h]) => <Link key={l} href={h}>{l}</Link>)}</nav>
          </div>
          <Link className="logo" href="/" aria-label="MAWJA home">
            <img className="lw" src="/brand/mawja-logo-beige.png" alt="MAWJA" width={988} height={155} />
            <img className="li" src="/brand/mawja-icon-beige.png" alt="" width={360} height={166} />
          </Link>
          <div className="tools">
            <button className="ib" aria-label={`Open cart, ${count} items`} onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="ov" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="scrim" aria-label="Close menu" onClick={() => setMenu(false)} />
          <aside className="panel panel-l">
            <div className="phead"><h2>Menu</h2><button className="ib" onClick={() => setMenu(false)} aria-label="Close">✕</button></div>
            <nav className="pbody mnav" onClick={() => setMenu(false)}>{NAV.map(([l, h]) => <Link key={l} href={h}>{l}</Link>)}</nav>
          </aside>
        </div>
      )}
    </>
  );
}
