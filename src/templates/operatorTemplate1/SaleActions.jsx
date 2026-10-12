// Template #1 sale actions (Phase 4C, Parts 21/30/31/32).
// Safe public sharing (copy link, native share, Facebook, email), add to
// calendar (Google / Outlook / iCal) and directions — all built from the
// canonical PUBLIC projection only (no private address data, ever).
import React, { useState } from 'react';
import { Link2, Share2, Facebook, Mail, CalendarPlus, MapPin } from 'lucide-react';
import { format } from 'date-fns';

function icsStamp(dateStr, timeStr, fallback) {
  if (!dateStr) return null;
  const t = timeStr ? timeStr.replace(/:/g, '') + '00' : (fallback || '090000');
  return `${dateStr.replace(/-/g, '')}T${t}`;
}

export default function SaleActions({ sale, hostname }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${hostname}/site/sale/${sale.public_id}`;
  const addr = sale.address || {};
  const place = addr.formatted_address || [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  const cityQuery = [addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
  const dates = Array.isArray(sale.sale_dates) ? sale.sale_dates : [];
  const first = dates[0] || {};

  const start = icsStamp(first.date, first.start_time, '090000');
  const end = icsStamp(first.date, first.end_time, '170000');

  const icsLines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EstateSalen//Operator Website//EN', 'BEGIN:VEVENT',
    `UID:${sale.public_id}@${hostname}`,
    `DTSTART:${start || ''}`, end ? `DTEND:${end}` : null,
    `SUMMARY:${(sale.title || 'Estate Sale').replace(/,/g, '\\,')}`,
    place ? `LOCATION:${place.replace(/,/g, '\\,')}` : null,
    `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean);
  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines.join('\r\n'))}`;

  const googleCal = start ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(sale.title || 'Estate Sale')}&dates=${start}/${end || start}&details=${encodeURIComponent(url)}${place ? `&location=${encodeURIComponent(place)}` : ''}` : null;
  const outlook = start ? `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(sale.title || 'Estate Sale')}&startdt=${encodeURIComponent(`${first.date}T${(first.start_time || '09:00')}`)}&enddt=${encodeURIComponent(`${first.date}T${(first.end_time || '17:00')}`)}${place ? `&location=${encodeURIComponent(place)}` : ''}&path=/calendar/action/compose&rru=addevent` : null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  }

  async function nativeShare() {
    if (navigator.share) {
      try { await navigator.share({ title: sale.title || 'Estate Sale', url }); } catch (e) { /* dismissed */ }
    }
  }

  const linkCls = 'inline-flex items-center gap-1 text-xs border rounded-md px-2.5 py-1.5 hover:opacity-80';
  const linkStyle = { borderColor: 'var(--t1-primary)', color: 'var(--t1-primary)' };

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--t1-primary)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide opacity-60 mr-1">Share &amp; plan</span>
        <button type="button" onClick={copyLink} className={linkCls} style={linkStyle}>
          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />{copied ? 'Copied!' : 'Copy Link'}
        </button>
        {navigator.share && (
          <button type="button" onClick={nativeShare} className={linkCls} style={linkStyle}>
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" /> Share
          </button>
        )}
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className={linkCls} style={linkStyle}>
          <Facebook className="w-3.5 h-3.5" aria-hidden="true" /> Facebook
        </a>
        <a href={`mailto:?subject=${encodeURIComponent(sale.title || 'Estate Sale')}&body=${encodeURIComponent(`${sale.title}\n${url}`)}`} className={linkCls} style={linkStyle}>
          <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Email
        </a>
        {start && <a href={googleCal} target="_blank" rel="noopener noreferrer" className={linkCls} style={linkStyle}><CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" /> Google</a>}
        {start && <a href={outlook} target="_blank" rel="noopener noreferrer" className={linkCls} style={linkStyle}><CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" /> Outlook</a>}
        {start && <a href={icsHref} download="estate-sale.ics" className={linkCls} style={linkStyle}><CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" /> iCal</a>}
        {cityQuery && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place || cityQuery)}`} target="_blank" rel="noopener noreferrer" className={linkCls} style={linkStyle}>
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Get Directions
          </a>
        )}
      </div>
    </div>
  );
}