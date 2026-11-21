// Shared renderer for the operator's printable sign library.
//
// House rules baked in here:
//  • No hyphens or dashes in sign text — they are normalised to spaces.
//  • One word = one row. The title is laid out word by word, each word on a
//    nowrap span, and the font size is fitted to the LONGEST word so a single
//    long word shrinks to stay on one row instead of breaking mid word. Every
//    row shares the same line height, so rows stay consistent.
//  • Arrows are real SVG arrows, never the "→" text character.
//  • layout 'fourup' prints the full one page sign four times on a single
//    letter sheet (2 × 2, dashed cut lines) so the operator can cut them out.
//  • layout 'price-pages' prints one letter page per category page (clothing,
//    kitchen, tools, video games, CDs and DVDs), each listing category price
//    ranges. A printed range is a guide only; the item record stays the price.

import { methodLabel } from './paymentSignData';

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const LETTER_W = 816; // 8.5in at 96dpi
const LETTER_H = 1056; // 11in at 96dpi
const BORDER = 3;

// Dashes of any kind become spaces; whitespace collapses to single spaces.
export const tidySignText = (value) =>
  String(value || '')
    .replace(/[-\u2010-\u2015]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Arial Black averages ~0.74em per glyph; letter spacing adds 4px per character.
const fitFontSize = (text, usableWidth, max = 118, min = 26) => {
  const words = tidySignText(text).split(' ').filter(Boolean);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
  const len = Math.max(1, longest.length);
  const size = (usableWidth / len - 4) / 0.74;
  return Math.max(min, Math.min(max, Math.floor(size)));
};

const titleHtml = (text, size) => {
  const words = tidySignText(text).split(' ').filter(Boolean);
  return `<div class="title" style="font-size:${size}px">${words
    .map((w) => `<span class="w">${esc(w)}</span>`)
    .join('')}</div>`;
};

const arrowHtml = (direction = 'right', size = 220) => {
  const flip = direction === 'left' ? ' transform="translate(120,0) scale(-1,1)"' : '';
  const spin = direction === 'up'
    ? ' transform="rotate(-90 60 50)"'
    : direction === 'down'
      ? ' transform="rotate(90 60 50)"'
      : '';
  return `<svg class="arrow" viewBox="0 0 120 100" width="${size}" height="${Math.round(size * 0.83)}" aria-hidden="true"><polygon points="0,38 68,38 68,10 120,50 68,90 68,62 0,62" fill="#1e293b"${flip}${spin}/></svg>`;
};

// Zelle / Venmo / Cash App QR panel. The image and handle come from the
// operator's business profile (or the sale's own payment settings); a handle
// without an uploaded QR still prints so the sign is never blank.
const QR_LABELS = { zelle: 'Zelle', venmo: 'Venmo', cashapp: 'Cash App' };

const qrBlockHtml = (key, data, scale) => {
  if (!data) return '';
  const label = QR_LABELS[key] || key;
  const img = data.qrUrl
    ? `<img src="${esc(data.qrUrl)}" alt="${esc(label)} QR code" style="width:${Math.round(205 * scale)}px;height:${Math.round(205 * scale)}px" />`
    : '';
  const handle = data.handle
    ? `<div class="handle" style="font-size:${Math.round(20 * scale)}px">${esc(data.handle)}</div>`
    : '';
  if (!img && !handle) return '';
  return `<div class="payqr">
    <div class="lbl" style="font-size:${Math.round(23 * scale)}px">${esc(label)}</div>
    ${img}${handle}
  </div>`;
};

// Which cards are accepted and which are not — two printed columns, never a guess.
const cardsBlockHtml = (cards, scale) => {
  if (!cards) return '';
  const col = (title, items, cls) => (items.length
    ? `<div class="cardcol ${cls}">
        <div class="cardhead" style="font-size:${Math.round(20 * scale)}px">${title}</div>
        <ul>${items.map((i) => `<li style="font-size:${Math.round(21 * scale)}px">${esc(i)}</li>`).join('')}</ul>
      </div>`
    : '');
  const yes = col('Accepted', cards.accepted || [], 'yes');
  const no = col('Not Accepted', cards.declined || [], 'no');
  if (!yes && !no) {
    // No card brands chosen on the profile yet — never guess which are accepted.
    return `<div class="body" style="font-size:${Math.round(26 * scale)}px">Ask staff which cards are accepted</div>`;
  }
  return `<div class="cards">${yes}${no}</div>`;
};

// One sign face. Used for a full letter page and, scaled down, for each 4 up cell.
const signFaceHtml = (template, { width, pad, maxTitle, scale, logoUrl, payment }) => {
  const text = tidySignText(template.signText || template.name);
  const usable = width - pad * 2;
  const size = fitFontSize(text, usable, maxTitle);
  const summary = template.paymentSummary && payment
    ? (payment.methods || []).map(methodLabel).filter(Boolean).join(' · ')
    : '';
  const bodyText = summary || (template.content ? tidySignText(template.content) : '');
  const body = bodyText
    ? `<div class="body" style="font-size:${Math.round(26 * scale)}px">${esc(bodyText)}</div>`
    : '';
  // 'both' / 'all' print every QR the operator has; a missing one prints nothing.
  const qrKeys = template.paymentQr === 'both' || template.paymentQr === 'all'
    ? ['zelle', 'venmo', 'cashapp']
    : template.paymentQr
      ? [template.paymentQr]
      : [];
  const qrs = payment
    ? qrKeys.map((key) => qrBlockHtml(key, payment[key], scale)).filter(Boolean).join('')
    : '';
  const qrWrap = qrs ? `<div class="payqrs">${qrs}</div>` : '';
  const cards = template.paymentCards && payment ? cardsBlockHtml(payment.cards, scale) : '';
  const arrow = template.arrow ? arrowHtml(template.arrow, Math.round(usable * 0.4)) : '';
  const priceLine = template.priceLine
    ? `<div class="priceline" style="height:${Math.round(120 * scale)}px;border-bottom-width:${Math.max(3, Math.round(6 * scale))}px"><span style="font-size:${Math.round(34 * scale)}px">$</span></div>`
    : '';
  const logo = logoUrl
    ? `<div class="logofoot"><img src="${esc(logoUrl)}" alt="Logo" style="max-height:${Math.round(96 * scale)}px;max-width:${Math.round(320 * scale)}px" /></div>`
    : '';

  return `<div class="cardbody">${titleHtml(text, size)}${body}${qrWrap}${cards}${arrow}${priceLine}</div>${logo}`;
};

const singlePageHtml = (template, logoUrl, payment) => {
  const width = LETTER_W - BORDER * 2 - 96;
  return `<div class="sheet">
    <div class="card">${signFaceHtml(template, { width, pad: 0, maxTitle: 118, scale: 1, logoUrl, payment })}</div>
  </div>`;
};

// The full one page sign, shrunk and duplicated four times on one sheet.
const fourUpPageHtml = (template, logoUrl) => {
  const pad = 27;
  const gap = 12;
  const cellW = Math.floor((LETTER_W - BORDER * 2 - pad * 2 - gap) / 2);
  const cellPad = 20;
  const cell = `<div class="cell">${signFaceHtml(template, {
    width: cellW, pad: cellPad, maxTitle: 62, scale: 0.5, logoUrl,
  })}</div>`;
  return `<div class="quad">${cell}${cell}${cell}${cell}</div>`;
};

const pricePagesHtml = (template, logoUrl) => {
  const pages = template.pages || [];
  const headingSize = (page) => fitFontSize(page.heading || template.name, LETTER_W - BORDER * 2 - 96, 62, 26);

  return pages.map((page, index) => `
    <div class="page">
      <div class="eyebrow">${esc(tidySignText(template.name))}</div>
      <h1 style="font-size:${headingSize(page)}px">${esc(tidySignText(page.heading || template.name))}</h1>
      <div class="rule"></div>
      <table>
        <tbody>
          ${(page.rows || []).map((row) => `<tr>
            <td class="label">${esc(tidySignText(row.label))}</td>
            <td class="price">${esc(row.price)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="footnote">Suggested price ranges only. Final prices are set by the operator.</div>
      <div class="pagefoot">
        <span>Page ${index + 1} of ${pages.length}</span>
        ${logoUrl ? `<img src="${esc(logoUrl)}" alt="Logo" />` : ''}
      </div>
    </div>`).join('');
};

const baseCss = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1e293b}
  .sheet,.page,.quad{width:8.5in;height:11in;background:#fff;position:relative;overflow:hidden;
    page-break-after:always;break-after:page}
  .sheet:last-child,.page:last-child,.quad:last-child{page-break-after:auto;break-after:auto}
  .sheet{border:${BORDER}px solid #1e293b;padding:48px;display:flex;flex-direction:column}
  .card{flex:1;display:flex;flex-direction:column;text-align:center;min-height:0}
  .cardbody{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;min-height:0}
  .title{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline;gap:0 .26em;width:100%}
  .title .w{white-space:nowrap;font-family:'Arial Black',Gadget,sans-serif;font-weight:900;
    letter-spacing:3px;line-height:1.12;text-transform:uppercase;color:#1e293b}
  .body{font-weight:700;color:#334155;letter-spacing:1px;text-transform:uppercase;line-height:1.35;max-width:100%}
  .arrow{display:block;margin:4px auto 0}
  .payqrs{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:30px;width:100%}
  .payqr{display:flex;flex-direction:column;align-items:center;gap:8px}
  .payqr img{object-fit:contain;background:#fff}
  .payqr .lbl{font-family:'Arial Black',Gadget,sans-serif;font-weight:900;letter-spacing:2px;
    text-transform:uppercase;color:#1e293b;line-height:1}
  .payqr .handle{font-weight:700;color:#334155;letter-spacing:.5px}
  .cards{display:flex;justify-content:center;align-items:flex-start;gap:24px;width:100%}
  .cardcol{flex:1;max-width:47%;border:3px solid #1e293b;padding:12px 16px;text-align:left}
  .cardcol.no{border-style:dashed;border-color:#64748b}
  .cardhead{font-family:'Arial Black',Gadget,sans-serif;font-weight:900;letter-spacing:2px;
    text-transform:uppercase;line-height:1.1;margin-bottom:6px}
  .cardcol.yes .cardhead{color:#166534}
  .cardcol.no .cardhead{color:#991b1b}
  .cardcol ul{list-style:none}
  .cardcol li{font-weight:700;color:#1e293b;line-height:1.4}
  .priceline{width:78%;border-bottom:6px solid #1e293b;display:flex;align-items:flex-end;padding:0 0 6px 4px}
  .priceline span{font-weight:900;line-height:1}
  .logofoot{display:flex;justify-content:flex-end;padding-top:12px}
  .logofoot img{object-fit:contain}
  .quad{padding:${27}px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:12px}
  .cell{border:2px dashed #64748b;padding:20px;display:flex;flex-direction:column;text-align:center;overflow:hidden}
  .cell .cardbody{gap:10px}
  .cell .logofoot{padding-top:6px}
  .page{border:${BORDER}px solid #1e293b;padding:44px;display:flex;flex-direction:column}
  .eyebrow{font-size:13px;letter-spacing:.3em;text-transform:uppercase;color:#475569;text-align:center}
  .page h1{font-family:'Arial Black',Gadget,sans-serif;font-weight:900;letter-spacing:2px;line-height:1.1;
    text-transform:uppercase;text-align:center;margin-top:6px}
  .rule{height:4px;background:#1e293b;margin:14px 0 4px}
  .page table{width:100%;border-collapse:collapse;flex:1}
  .page tr:nth-child(even){background:#f1f5f9}
  .page td{font-size:19px;padding:8px 10px;border-bottom:1px solid #cbd5e1}
  .page td.label{text-align:left}
  .page td.price{text-align:right;font-weight:700;white-space:nowrap}
  .footnote{font-size:11px;color:#64748b;margin-top:12px;text-align:center}
  .pagefoot{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#64748b;margin-top:8px}
  .pagefoot img{max-height:60px;max-width:240px;object-fit:contain}
  @media print{
    @page{size:letter;margin:0}
    body{padding:0}
    .sheet,.page,.quad{border-color:#000}
    .cell{border-color:#94a3b8}
  }
`;

const viewCss = `
  body{background:#eef2f7;display:flex;flex-direction:column;align-items:center;gap:22px;padding:22px}
  .sheet,.page,.quad{box-shadow:0 4px 24px rgba(0,0,0,.16);flex:0 0 auto}
`;

/**
 * Build the printable document for one sign template.
 * @param {object} template  an entry from SIGN_TEMPLATES
 * @param {{forView?: boolean, logoUrl?: string, payment?: object}} options
 *   payment: resolvePaymentSignData(user, salePaymentOptions) — drives the
 *   Zelle / Venmo QR panels and the accepted / not accepted card lists.
 */
export function renderSignDocument(template, { forView = false, logoUrl = '', payment = null } = {}) {
  const body = template.layout === 'price-pages' && (template.pages || []).length
    ? pricePagesHtml(template, logoUrl)
    : template.layout === 'fourup'
      ? fourUpPageHtml(template, logoUrl)
      : singlePageHtml(template, logoUrl, payment);

  return `<html><head><title>${esc(template.name)}</title><style>${baseCss}${forView ? viewCss : ''}</style></head>
    <body>${body}${forView ? '' : '<script>window.onload=()=>window.print();<\/script>'}</body></html>`;
}

export function signLayoutLabel(template) {
  if (template.layout === 'fourup') return '4 up per sheet';
  if (template.layout === 'price-pages') {
    const count = (template.pages || []).length;
    return `${count} page${count === 1 ? '' : 's'}`;
  }
  return '1 page';
}