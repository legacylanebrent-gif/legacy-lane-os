import { jsPDF } from 'jspdf';

// Chapter 9 P1 — agreement PDF.
// Derives ONLY from the agreement's frozen body_text snapshot — never from live
// records — so reprinting an executed agreement reproduces exactly what was
// agreed at signing, even after later changes.

export function downloadAgreementPdf(agreement) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 495;
  const M = 50;
  let y = 60;

  const ensure = (needed = 20) => { if (y > 790 - needed) { doc.addPage(); y = 60; } };

  const para = (text, { size = 10, style = 'normal', color = [30, 41, 59], gap = 15 } = {}) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    doc.splitTextToSize(String(text ?? ''), W).forEach(t => {
      ensure(16);
      doc.text(t, M, y);
      y += gap;
    });
  };

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Agreement v${agreement.version} — status: ${agreement.status}${agreement.executed_at ? ` — executed ${new Date(agreement.executed_at).toLocaleDateString()}` : ''}`, M, y);
  y += 22;
  doc.setDrawColor(220, 226, 232);
  doc.line(M, y - 10, M + W, y - 10);

  const body = String(agreement.body_text || '');
  body.split('\n').forEach(raw => {
    const t = raw.trim();
    if (!t) { y += 6; return; }
    const isHeading = t.length < 70 && (t === t.toUpperCase() || /^[A-Z0-9 ,.&'\/-]+$/.test(t));
    para(t, isHeading ? { size: 11, style: 'bold', gap: 16 } : {});
  });

  y += 8;
  para('Generated from the finalized agreement snapshot. EstateSalen populated the operator\'s own approved template — it does not provide legal advice or validate signatures.', { size: 8, color: [148, 163, 184] });

  doc.save(`agreement-v${agreement.version}${agreement.status === 'EXECUTED' ? '-executed' : ''}.pdf`);
}