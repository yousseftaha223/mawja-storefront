import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import SignOut from "@/components/admin/SignOut";

export const metadata: Metadata = { title: "Mawja Dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const NAV = [["Orders", "/admin"], ["Website Settings", "/admin/content/site_settings"], ["Announcement Bar", "/admin/content/announcement"], ["Hero Section", "/admin/content/hero"],
  ["Promotional Image", "/admin/content/promo_image"], ["Men’s Fragrances", "/admin/products?cat=men"], ["Women’s Fragrances", "/admin/products?cat=women"], ["Promotional Bundles", "/admin/bundles"], ["Footer Settings", "/admin/content/footer"]];

export default async function Panel({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser(); if (!user) redirect("/admin/login");
  const { data: adm } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!adm) return <main className="p-10"><p className="mb-3">This account is not authorized to manage the store.</p><SignOut /></main>;
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-navy text-swan md:min-h-screen md:w-64 md:shrink-0">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <span className="font-serif text-2xl">Mawja Admin</span>
          <span className="md:hidden [&_button]:text-swan"><SignOut /></span>
        </div>
        <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(([l, h]) => <Link key={h} href={h} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-white/10">{l}</Link>)}
          <Link href="/" target="_blank" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-sand hover:bg-white/10">View website ↗</Link>
        </nav>
        <div className="hidden px-5 py-4 md:block [&_button]:text-swan"><SignOut /></div>
      </aside>
      <main className="flex-1 p-5 md:p-10">{children}</main>
    </div>
  );
}
