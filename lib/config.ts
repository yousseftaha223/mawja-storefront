// Single source of truth for the dashboard's "single-row" content sections (client + server safe).
export type F = { name: string; label: string; type: "text" | "textarea" | "checkbox" | "color" | "datetime" | "select" | "image" | "url"; options?: string[]; hint?: string; required?: boolean };
export const PALETTE = [
  { name: "Navy Blue", hex: "#101F3A" }, { name: "Royal Blue", hex: "#244C85" }, { name: "Deep Ocean Teal", hex: "#0C6F70" },
  { name: "Deep Teal", hex: "#076966" }, { name: "Warm Sand", hex: "#D9C2A2" }, { name: "Warm Sand Accent", hex: "#E0C5A3" },
  { name: "Soft Ivory", hex: "#F5F1EA" }, { name: "Swan Wing", hex: "#F5EEE4" }, { name: "Mist Blue", hex: "#A7B3C3" },
];
export const SINGLETONS: Record<string, { title: string; tag: string; intro: string; preview?: "announcement"; fields: F[] }> = {
  site_settings: {
    title: "Website Settings", tag: "settings", intro: "Global details: SEO, currency and the note shown at checkout.",
    fields: [
      { name: "seo_title", label: "Browser / SEO title", type: "text", required: true },
      { name: "seo_description", label: "SEO description", type: "textarea" },
      { name: "currency", label: "Currency label", type: "text", required: true, hint: "Shown before prices, e.g. EGP" },
      { name: "order_note", label: "Checkout note", type: "textarea", hint: "Shown under the order button, e.g. how payment and delivery are confirmed." },
    ],
  },
  announcement: {
    title: "Announcement Bar", tag: "announcement", preview: "announcement", intro: "A full-width bar at the very top of the site. It follows the start and end dates automatically.",
    fields: [
      { name: "is_active", label: "Show announcement bar", type: "checkbox" },
      { name: "text", label: "Text", type: "text", required: true },
      { name: "bg_color", label: "Background color", type: "color" },
      { name: "text_color", label: "Text color", type: "color" },
      { name: "link_url", label: "Link (optional)", type: "url" },
      { name: "starts_at", label: "Starts at (optional)", type: "datetime" },
      { name: "ends_at", label: "Ends at (optional)", type: "datetime" },
    ],
  },
  hero: {
    title: "Hero Section", tag: "hero", intro: "The first thing visitors see.",
    fields: [
      { name: "image_path", label: "Hero image", type: "image" },
      { name: "headline", label: "Headline", type: "text", required: true },
      { name: "description", label: "Supporting text", type: "textarea" },
      { name: "cta_label", label: "Button label", type: "text" },
      { name: "cta_url", label: "Button destination", type: "url", hint: "e.g. #men, #women, or a full link" },
      { name: "cta2_label", label: "Second button label (optional)", type: "text" },
      { name: "cta2_url", label: "Second button destination", type: "url" },
    ],
  },
  promo_image: {
    title: "Promotional Image", tag: "promo", intro: "Full-width image right after the hero — campaigns, seasonal or lifestyle photography.",
    fields: [
      { name: "is_active", label: "Show this section", type: "checkbox" },
      { name: "image_path", label: "Image", type: "image" },
      { name: "link_url", label: "Destination link (optional)", type: "url" },
      { name: "ratio", label: "Desktop display ratio", type: "select", options: ["21/9", "16/9", "3/2", "4/3", "1/1"] },
      { name: "alt_text", label: "Alternative text", type: "text" },
    ],
  },
  footer: {
    title: "Footer Settings", tag: "footer", intro: "Empty fields are hidden on the site. Social icons appear once you add a link.",
    fields: [
      { name: "brand_statement", label: "Brand statement", type: "textarea" },
      { name: "contact_email", label: "Contact email", type: "text" },
      { name: "contact_phone", label: "Contact phone", type: "text" },
      { name: "contact_address", label: "Address", type: "text" },
      { name: "instagram_url", label: "Instagram link", type: "url" },
      { name: "tiktok_url", label: "TikTok link", type: "url" },
      { name: "facebook_url", label: "Facebook link", type: "url" },
      { name: "whatsapp_url", label: "WhatsApp link", type: "url", hint: "e.g. https://wa.me/20XXXXXXXXXX" },
      { name: "shipping_url", label: "Shipping policy link", type: "url" },
      { name: "returns_url", label: "Return policy link", type: "url" },
      { name: "privacy_url", label: "Privacy policy link", type: "url" },
      { name: "copyright", label: "Copyright text", type: "text" },
    ],
  },
};
export const ORDER_STATUSES = ["new", "confirmed", "shipped", "delivered", "cancelled"];
