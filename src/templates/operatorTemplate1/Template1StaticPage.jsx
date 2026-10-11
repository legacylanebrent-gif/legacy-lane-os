// Template #1 static/content pages (Part 29) — About, Services, Contact, FAQ,
// Legal. All copy from tenant settings; contact page renders the seller
// inquiry form. No operator identity hardcoding.
import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import LeadForm from './LeadForm.jsx';

function Paragraphs({ text }) {
  if (!text) return null;
  return text.split(/\n\s*\n/).map((para, i) => <p key={i} className="text-sm sm:text-base leading-relaxed opacity-90 mb-3">{para}</p>);
}

export default function Template1StaticPage({ pageType, website, leadContext }) {
  const settings = website.settings || {};
  const contact = settings.contact || {};
  const businessName = settings.display_business_name || website.company.display_name || website.site_name;

  if (pageType === 'about') {
    const a = settings.about || {};
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">{a.headline || `About ${businessName}`}</h1>
        {a.body ? <Paragraphs text={a.body} /> : <p className="opacity-70 text-sm">Information coming soon.</p>}
      </div>
    );
  }

  if (pageType === 'services') {
    const s = settings.services || {};
    const items = s.items || [];
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">{s.headline || 'Our Services'}</h1>
        {s.intro && <p className="opacity-80 mb-6 max-w-2xl">{s.intro}</p>}
        {items.length === 0 ? <p className="opacity-70 text-sm">Service information coming soon.</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
                <h2 className="font-semibold">{it.title}</h2>
                {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (pageType === 'contact') {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold mb-4">Contact {businessName}</h1>
          <div className="space-y-3 text-sm">
            {contact.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 opacity-70" aria-hidden="true" /><a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a></p>}
            {contact.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-70" aria-hidden="true" /><a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></p>}
            {contact.address_display && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-70" aria-hidden="true" />{contact.address_display}</p>}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-3">Request a Consultation</h2>
          <LeadForm leadType="seller_inquiry" sales={[]} hostname={website.hostname} />
        </div>
      </div>
    );
  }

  if (pageType === 'faq') {
    const f = settings.faq || {};
    const items = f.items || [];
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">{f.headline || 'Frequently Asked Questions'}</h1>
        {items.length === 0 ? <p className="opacity-70 text-sm">FAQ coming soon.</p> : (
          <div className="divide-y">
            {items.map((qa, i) => (
              <details key={i} className="py-3 group">
                <summary className="cursor-pointer font-medium">{qa.question}</summary>
                <p className="mt-2 text-sm opacity-80">{qa.answer}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    );
  }

  // legal
  const l = settings.legal || {};
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Privacy &amp; Terms</h1>
      {l.privacy_policy_text && <><h2 className="text-lg font-semibold mt-4 mb-2">Privacy Policy</h2><Paragraphs text={l.privacy_policy_text} /></>}
      {l.terms_text && <><h2 className="text-lg font-semibold mt-4 mb-2">Terms of Service</h2><Paragraphs text={l.terms_text} /></>}
      {!l.privacy_policy_text && !l.terms_text && <p className="opacity-70 text-sm">Legal information coming soon.</p>}
    </div>
  );
}