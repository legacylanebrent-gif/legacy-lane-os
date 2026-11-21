// Early sign in print kit.
//
// Two things print from here, both for the morning the sale starts:
//  1. the paper sign in sheet the operator keeps at the door as a backup, and
//  2. the door sign carrying THIS sale's early sign in QR code.
//
// The QR is deliberately NOT the check in QR: a check in records someone who is
// on site today, while an early sign in is a shopper saying they intend to come.
// Signing in needs a free EstateSalen account, so the door sign also brings new
// shoppers onto the platform.
import { format } from 'date-fns';

export const earlySignInUrl = (saleId) =>
  `${window.location.origin}/EstateSaleDetail?id=${encodeURIComponent(saleId)}&signin=1`;

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

const openPrint = (html) => {
  const w = window.open('', '', 'width=850,height=1100');
  if (!w) {
    alert('Allow pop ups for this site to print the sheet.');
    return;
  }
  w.document.write(html);
  w.document.close();
};

const dayLines = (sale) => {
  const dates = Array.isArray(sale?.sale_dates) ? sale.sale_dates.filter((d) => d?.date) : [];
  return dates
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const day = format(new Date(`${d.date}T00:00:00`), 'EEEE, MMMM d');
      const start = d.start_time ? format(new Date(`${d.date}T${d.start_time}`), 'h:mm a') : '';
      const end = d.end_time ? format(new Date(`${d.date}T${d.end_time}`), 'h:mm a') : '';
      if (start && end) return `${day} · ${start} to ${end}`;
      return day;
    });
};

const addressLine = (sale) => {
  const a = sale?.property_address || {};
  const cityState = [a.city, a.state].filter(Boolean).join(', ');
  return [a.street, cityState, a.zip].filter(Boolean).join(' · ');
};

const sheetCss = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff}
  .sheet{width:8.5in;height:11in;padding:.5in;border:3px solid #1e293b;display:flex;flex-direction:column}
  .head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
  .headtext{min-width:0;flex:1}
  .eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#475569}
  h1{font-family:'Arial Black',Gadget,sans-serif;font-size:30px;line-height:1.1;text-transform:uppercase;
    letter-spacing:1px;margin:6px 0 8px}
  .day{font-size:14px;font-weight:700;margin-bottom:2px}
  .addr{font-size:12px;color:#475569;margin-top:4px}
  .qrbox{text-align:center;flex:0 0 auto}
  .qrbox img{width:1.55in;height:1.55in;object-fit:contain}
  .qrcap{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#475569;margin-top:2px}
  .rule{height:4px;background:#1e293b;margin:14px 0 10px}
  table{width:100%;border-collapse:collapse;flex:1}
  th{font-size:10px;letter-spacing:.12em;text-transform:uppercase;text-align:left;color:#334155;
    border-bottom:2px solid #1e293b;padding:6px 6px}
  td{border-bottom:1px solid #94a3b8;height:.33in;font-size:13px;padding:0 6px}
  td.num{width:.42in;text-align:center;color:#64748b;font-weight:700}
  th.num{width:.42in;text-align:center}
  .foot{display:flex;justify-content:space-between;font-size:9px;color:#64748b;padding-top:8px}
  @media print{@page{size:letter;margin:0}body{padding:0}.sheet{border-color:#000}}
`;

const doorCss = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff}
  .sign{width:8.5in;height:11in;padding:.55in;border:6px solid #1e293b;display:flex;flex-direction:column;
    align-items:center;justify-content:space-between;text-align:center}
  .eyebrow{font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#475569;max-width:100%}
  h1{font-family:'Arial Black',Gadget,sans-serif;font-size:84px;line-height:1;text-transform:uppercase;
    letter-spacing:2px}
  .qr{width:3.9in;height:3.9in;object-fit:contain}
  .scan{font-family:'Arial Black',Gadget,sans-serif;font-size:22px;letter-spacing:2px;text-transform:uppercase}
  ol{text-align:left;font-size:16px;font-weight:700;line-height:1.5;padding-left:.35in;color:#334155}
  .dates{font-size:14px;font-weight:700;line-height:1.5}
  .logo{max-height:.7in;max-width:2.6in;object-fit:contain}
  .foot{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#64748b}
  @media print{@page{size:letter;margin:0}body{padding:0}.sign{border-color:#000}}
`;

/** The paper sign in sheet the operator keeps at the door as a backup. */
export function printEarlySignInSheet({ sale, qrDataUrl }) {
  const days = dayLines(sale);
  const address = addressLine(sale);
  const rows = Array.from({ length: 17 }, (_, i) => `<tr><td class="num">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');

  openPrint(`<html><head><title>Sign In Sheet ${esc(sale?.title || '')}</title><style>${sheetCss}</style></head>
  <body>
    <div class="sheet">
      <div class="head">
        <div class="headtext">
          <div class="eyebrow">Estate Sale Sign In</div>
          <h1>${esc(sale?.title || 'Sale')}</h1>
          ${days.map((d) => `<p class="day">${esc(d)}</p>`).join('')}
          ${address ? `<p class="addr">${esc(address)}</p>` : ''}
        </div>
        ${qrDataUrl ? `<div class="qrbox"><img src="${qrDataUrl}" alt="Early sign in QR code" /><div class="qrcap">Scan to sign in</div></div>` : ''}
      </div>
      <div class="rule"></div>
      <table>
        <thead><tr><th class="num">#</th><th>Name</th><th>Email or Phone</th><th>Time In</th><th>Initials</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="foot"><span>EstateSalen.com</span><span>Page 1</span></div>
    </div>
    <script>window.onload = () => window.print();<\/script>
  </body></html>`);
}

/** The door sign: this sale's own early sign in QR code, hung at the entrance. */
export function printEarlySignInDoorSign({ sale, qrDataUrl, logoUrl }) {
  const days = dayLines(sale);

  openPrint(`<html><head><title>Sign In Sign ${esc(sale?.title || '')}</title><style>${doorCss}</style></head>
  <body>
    <div class="sign">
      <div class="eyebrow">${esc(sale?.title || 'Estate Sale')}</div>
      <h1>Sign In<br />Here</h1>
      ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="Early sign in QR code" />` : ''}
      <div class="scan">Scan with your phone camera</div>
      <ol>
        <li>Scan the code on this sign</li>
        <li>Sign in or create a free EstateSalen account</li>
        <li>Sign the early sign in list for today</li>
      </ol>
      ${days.length ? `<div class="dates">${days.map((d) => esc(d)).join('<br />')}</div>` : ''}
      ${logoUrl ? `<img class="logo" src="${esc(logoUrl)}" alt="Logo" />` : ''}
      <div class="foot">EstateSalen.com</div>
    </div>
    <script>window.onload = () => window.print();<\/script>
  </body></html>`);
}