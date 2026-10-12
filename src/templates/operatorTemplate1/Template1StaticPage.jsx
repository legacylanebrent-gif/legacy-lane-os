// Template #1 static/content pages (Phase 4B — Parts 10/12/16/17/18/19/24).
// About (mission/owner/team), Services (dedicated-page links), Contact
// (hours, socials, service area, consultation CTA), FAQ (visible items),
// Legal + structured Policies. All copy from tenant settings; the contact
// page renders the seller inquiry form. No operator identity hardcoding.
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { sitePath } from '@/templates/siteLinks';
import LeadForm from './LeadForm.jsx';
import IconBadge from './IconBadge.jsx';

function Paragraphs({ text }) {
  if (!text) return null;
  return text.split(/\n\s*\n/).map((para, i) => <p key={i} className="text-sm sm:text-base leading-relaxed opacity-90 mb-3">{para}</p>);
}

export default function Template1StaticPage({ pageType, website, leadContext }) {
  const settings = website.settings || {};
  const contact = settings.contact || {};
  const businessName = settings.display_business_name || website.company.display_name || website.site_name;
  const social = settings.social || {};
  const socials = Object.entries(social).filter(([, v]) => v);

  if (pageType === 'about') {
    const a = settings.about || {};
    const biz = settings.business || {};
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">{a.headline || `About ${businessName}`}</h1>
        {a.body && <Paragraphs text={a.body} />}
        {a.mission && <><h2 className="text-lg font-semibold mt-6 mb-2">Our Mission</h2><Paragraphs text={a.mission} /></>}
        {(biz.years_experience || biz.year_founded) && (
          <p className="text-sm opacity-80 mt-2">{biz.years_experience ? `${biz.years_experience} of experience` : ''}{biz.years_experience && biz.year_founded ? ' · ' : ''}{biz.year_founded ? `Founded ${biz.year_founded}` : ''}</p>
        )}
        {a.owner_photo_url && <img src={a.owner_photo_url} alt={(biz.owner_name || 'Owner')} className="mt-6 rounded-lg w-full max-w-sm object-cover" />}
        {a.owner_bio && <><h2 className="text-lg font-semibold mt-4 mb-2">{biz.owner_name ? `Meet ${biz.owner_name}` : 'Meet the Owner'}</h2><Paragraphs text={a.owner_bio} /></>}
        {a.team_intro && <><h2 className="text-lg font-semibold mt-6 mb-2">Our Team</h2><Paragraphs text={a.team_intro} /></>}
        {a.team_photo_url && <img src={a.team_photo_url} alt="Our team" className="mt-4 rounded-lg w-full max-w-md object-cover" />}
        {(a.team_members || []).length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {a.team_members.map((m, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
                {m.photo_url && <img src={m.photo_url} alt={m.name} className="w-14 h-14 rounded-full object-cover mb-2" />}
                <div className="font-semibold">{m.name}</div>
                {m.role && <div className="text-xs opacity-70">{m.role}</div>}
                {m.bio && <p className="mt-1 text-sm opacity-80">{m.bio}</p>}
              </div>
            ))}
          </div>
        )}
        {!a.body && !a.mission && !a.owner_bio && !a.team_intro && <p className="opacity-70 text-sm">Information coming soon.</p>}
      </div>
    );
  }

  if (pageType === 'services') {
    const s = settings.services || {};
    const items = (s.items || []).filter(it => it.enabled !== false);
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">{s.headline || 'Our Services'}</h1>
        {s.intro && <p className="opacity-80 mb-6 max-w-2xl">{s.intro}</p>}
        {items.length === 0 ? <p className="opacity-70 text-sm">Service information coming soon.</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--t1-primary)' }}>
                {it.icon && <span className="inline-flex mb-2" style={{ color: 'var(--t1-primary)' }}><IconBadge icon={it.icon} /></span>}
                {it.image_url && <img src={it.image_url} alt={it.title || 'Service'} className="rounded-md mb-2 w-full h-36 object-cover" />}
                {it.dedicated_page && it.seo_slug ? (
                  <Link to={sitePath(website.hostname, `/site/services/${it.seo_slug}`)} className="font-semibold hover:underline" style={{ color: 'var(--t1-primary)' }}>{it.title}</Link>
                ) : <h2 className="font-semibold">{it.title}</h2>}
                {it.description && <p className="mt-1 text-sm opacity-80">{it.description}</p>}
                {it.dedicated_page && it.seo_slug && (
                  <Link to={sitePath(website.hostname, `/site/services/${it.seo_slug}`)} className="inline-block mt-2 text-sm font-medium hover:underline" style={{ color: 'var(--t1-primary)' }}>Learn more →</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (pageType === 'contact') {
    const biz = settings.business || {};
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold mb-4">Contact {businessName}</h1>
          <div className="space-y-3 text-sm">
            {contact.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 opacity-70" aria-hidden="true" /><a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a></p>}
            {contact.sms_number && <p className="flex items-center gap-2"><Phone className="w-4 h-4 opacity-70" aria-hidden="true" />Text: <a href={`sms:${contact.sms_number}`} className="hover:underline">{contact.sms_number}</a></p>}
            {contact.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-70" aria-hidden="true" /><a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a></p>}
            {contact.inquiry_email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 opacity-70" aria-hidden="true" />Inquiries: <a href={`mailto:${contact.inquiry_email}`} className="hover:underline">{contact.inquiry_email}</a></p>}
            {contact.show_address !== false && (contact.address_display || contact.mailing_address) && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-70" aria-hidden="true" />{contact.address_display || contact.mailing_address}</p>}
            {contact.business_hours && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 opacity-70 mt-0.5" aria-hidden="true" />
                <div>{contact.business_hours.split(/\n/).map((l, i) => <div key={i}>{l}</div>)}</div>
              </div>
            )}
          </div>
          {(biz.primary_city || (biz.cities_served || []).length > 0) && (
            <div className="mt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide opacity-70 mb-1">Service Area</h2>
              <p className="text-sm opacity-85">
                {[
                  biz.primary_city && `Based in ${biz.primary_city}`,
                  (biz.cities_served || []).length > 0 && biz.cities_served.slice(0, 10).join(', ')
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
          {socials.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {socials.map(([k, url]) => (
                <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="text-sm border rounded-md px-3 py-1.5 hover:underline capitalize" style={{ borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' }}>{k}</a>
              ))}
            </div>
          )}
          {contact.contact_cta_label && (
            <p className="mt-5 text-sm font-semibold" style={{ color: 'var(--t1-primary)' }}>{contact.contact_cta_label}</p>
          )}
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
    const items = (f.items || []).filter(qa => qa.visible !== false);
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

  // legal — privacy/terms copy + structured tenant policies.
  const l = settings.legal || {};
  const pol = settings.policies || {};
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Privacy &amp; Terms</h1>
      {l.privacy_policy_text && <><h2 className="text-lg font-semibold mt-4 mb-2">Privacy Policy</h2><Paragraphs text={l.privacy_policy_text} /></>}
      {l.terms_text && <><h2 className="text-lg font-semibold mt-4 mb-2">Terms of Service</h2><Paragraphs text={l.terms_text} /></>}
      {(pol.items || []).map((p, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold mt-6 mb-2">{p.title}</h2>
          {p.body && <Paragraphs text={p.body} />}
        </div>
      ))}
      {!l.privacy_policy_text && !l.terms_text && (pol.items || []).length === 0 && <p className="opacity-70 text-sm">Legal information coming soon.</p>}
    </div>
  );
}