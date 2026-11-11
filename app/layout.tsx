import "./globals.css";
import type { Metadata } from "next";
import { getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s?.seo_title || "MAWJA — Remember Yourself";
  const description = s?.seo_description || "Premium Egyptian fragrances. Find your signature scent.";
  return { title, description, openGraph: { title, description, type: "website" }, icons: { icon: "/brand/mawja-icon.png" } };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
