// Template #1 shell — header/nav/footer driven entirely by tenant settings and
// Company public context. Phase 4B: navigation manager + footer manager.
// No hardcoded operator identity (Part 42).
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, Youtube, Linkedin } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';

const SOCIAL_ICONS = [
  ['facebook', Facebook], ['instagram', Instagram], ['twitter', Twitter], ['youtube', Youtube], ['linkedin', Linkedin]
];

// Default navigation: controlled template paths only. Gallery appears only
// when the tenant has gallery content; about/services only with content.
function defaultNav(settings) {
  return [
    { key: 'home', label: 'Home', path: '/site' },
    { key: 'sales', label: 'Estate Sales', path: '/site/sales' },
    ((settings.about || {}).headline || (settings.about || {}).body) ? { key: 'about', label: 'About', path: '/site/about' } : null,
    (((settings.services || {}).items) || []).length > 0 ? { key: 'services', label: 'Services', path: '/site/services' } : null,
    (((settings.gallery || {}).items) || []).length > 0 ? { key: 'gallery', label: 'Gallery', path: '/site/gallery' } : null,
    { key: 'contact', label: 'Contact', path: '/site/contact' },
    (((settings.faq || {}).items) || []).length > 0 ? { key: 'faq', label: 'FAQ', path: '/site/faq' } : null
  ].filter(Boolean);
}

export default function Template1Shell({ settings, siteName, hostname, children }) {
  const b = settings.branding || {};
  const contact = settings.contact || {};
  const social = settings.social || {};
  const footer = settings.footer || {};
  const style = {
    '--t1-primary': b.primary_color || '#0f766e',
    '--t1-secondary': b.secondary_color || '#134e4a',
    '--t1-accent': b.accent_color || '#b45309',
    '--t1-bg': b.background_color || '#ffffff',
    '--t1-text': b.text_color || '#1f2937',
    background: 'var(--t1-bg)',
    color: 'var(--t1-text)',
    fontFamily: b.body_font_family || 'system-ui, -apple-system, sans-serif'
  };
  const headingStyle = { fontFamily: b.heading_font_family || 'Georgia, serif' };
  const nav = ((settings.navigation || {}).items || []).length > 0
    ? settings.navigation.items
    : defaultNav(settings);
  const businessName = settings.display_business_name || siteName;
  const socials = SOCIAL_ICONS.filter(([k]) => social[k]);

  return (
    <div style={style} className="min-h-screen flex flex-col">
      <a href="#t1-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>
      <header className="border-b" style={{ borderColor: 'var(--t1-primary)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link to={sitePath(hostname, '/site')} className="flex items-center gap-3">
            {b.logo_url ? (
              <img src={b.logo_url} alt={`${businessName} logo`} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-xl font-bold" style={{ color: 'var(--t1-primary)', ...headingStyle }}>{businessName}</span>
            )}
            {b.logo_url && <span className="text-lg font-semibold" style={headingStyle}>{businessName}</span>}
          </Link>
          {settings.tagline && <p className="text-sm opacity-70">{settings.tagline}</p>}
        </div>
        <nav aria-label="Site navigation" className="max-w-5xl mx-auto px-4 pb-3 flex flex-wrap gap-4">
          {nav.map(item => (
            <Link key={item.key || item.path} to={sitePath(hostname, item.path)} className="text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="t1-main" className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
      <footer className="mt-8 py-8 text-sm" style={{ background: 'var(--t1-secondary)', color: '#ffffff' }}>
        <div className="max-w-5xl mx-auto px-4 grid gap-4 sm:grid-cols-3">
          <div>
            {footer.logo_url && <img src={footer.logo_url} alt={`${businessName} logo`} className="h-9 w-auto object-contain mb-2 bg-white/80 rounded px-1" />}
            <p className="font-semibold" style={headingStyle}>{footer.copyright_name || businessName}</p>
            {footer.description && <p className="mt-1 opacity-90 max-w-xs">{footer.description}</p>}
            {(contact.show_address !== false) && contact.address_display && <p className="mt-1 flex items-center gap-1 opacity-90"><MapPin className="w-3 h-3" aria-hidden="true" />{contact.address_display}</p>}
          </div>
          <div>
            {contact.phone && <p className="flex items-center gap-1 opacity-90"><Phone className="w-3 h-3" aria-hidden="true" /><a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a></p>}
            {contact.sms_number && contact.sms_number !== contact.phone && <p className="flex items-center gap-1 opacity-90"><Phone className="w-3 h-3" aria-hidden="true" />Text: <a href={`sms:${contact.sms_number}`} className="hover:underline">{contact.sms_number}</a></p>}
            {contact.email && <p className="flex items-center gap-1 opacity-90"><Mail className="w-3 h-3" aria-hidden="true" /><a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></p>}
          </div>
          <div className="flex items-start gap-3">
            {socials.map(([k, Icon]) => (
              <a key={k} href={social[k]} target="_blank" rel="noopener noreferrer" aria-label={`${businessName} on ${k}`} className="opacity-90 hover:opacity-100">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 mt-4 flex flex-wrap gap-4 opacity-80 text-xs">
          <Link to={sitePath(hostname, '/site/legal')} className="hover:underline">Privacy &amp; Terms</Link>
          {footer.show_powered_by !== false && <span>Powered by EstateSalen</span>}
          {hostname && <span>{hostname}</span>}
        </div>
      </footer>
    </div>
  );
}