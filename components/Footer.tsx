const ICONS: Record<string, React.ReactNode> = {
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>,
  tiktok: <path d="M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />,
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  whatsapp: <><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" /><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" /></>,
};
export default function Footer({ f }: { f: any }) {
  if (!f) return null;
  const socials = (["instagram", "tiktok", "facebook", "whatsapp"] as const).filter((k) => f[`${k}_url`]);
  const links = [["Shipping policy", f.shipping_url], ["Return policy", f.returns_url], ["Privacy policy", f.privacy_url]].filter(([, u]) => u);
  const hasContact = f.contact_email || f.contact_phone || f.contact_address;
  return (
    <footer className="foot">
      <div className="foot-in">
        <div>
          <img src="/brand/mawja-logo-beige.png" alt="MAWJA" width={988} height={155} loading="lazy" style={{ height: 26, width: "auto" }} />
          {f.brand_statement && <p className="statement">{f.brand_statement}</p>}
          {!!socials.length && (
            <div className="soc">
              {socials.map((k) => (
                <a key={k} href={f[`${k}_url`]} target="_blank" rel="noopener noreferrer" aria-label={k}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[k]}</svg>
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          {!!links.length && <><h4>Information</h4><ul>{links.map(([l, u]) => <li key={l}><a href={u}>{l}</a></li>)}</ul></>}
        </div>
        <div>
          {hasContact && (
            <>
              <h4>Contact</h4>
              <address className="grid gap-2 not-italic" style={{ fontSize: 15 }}>
                {f.contact_email && <a href={`mailto:${f.contact_email}`}>{f.contact_email}</a>}
                {f.contact_phone && <a href={`tel:${f.contact_phone}`}>{f.contact_phone}</a>}
                {f.contact_address && <span>{f.contact_address}</span>}
              </address>
            </>
          )}
        </div>
      </div>
      {f.copyright && <p className="fine">{f.copyright}</p>}
    </footer>
  );
}
