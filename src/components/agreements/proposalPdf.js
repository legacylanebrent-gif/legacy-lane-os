import { jsPDF } from 'jspdf';
import { OUTCOME_LABELS, ESTIMATE_NOTE } from './proposalModel';

// Chapter 9 P1 — client proposal PDF.
// Derives ONLY from the proposal SNAPSHOT, never from live records: reprinting
// a finalized version reproduces that version exactly, even after current
// records change. All money language is ESTIMATE — NOT A GUARANTEE.

const money = (n) => (n == null || n === '' ? null : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const dateLine = (d) => {
  if (!d) return 'Dates not yet scheduled';
  const t = (x) => (x ? `, ${x}` : '');
  return d.date + t(d.start_time && ` ${d.start_time}`) + t(d.end_time && `-${d.end_time}`);
};

export function downloadProposalPdf(proposal, saleTitle) {
  const s = proposal.snapshot || {};
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 495;
  const M = 50;
  let y = 60;

  const line = (text, { size = 10, style = 'normal', gap = 15, color = [30, 41, 59] } = {}) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(String(text ?? ''), W);
    wrapped.forEach(t => {
      if (y > 780) { doc.addPage(); y = 60; }
      doc.text(t, M, y);
      y += gap;
    });
  };
  const heading = (text) => {
    y += 10;
    if (y > 760) { doc.addPage(); y = 60; }
    doc.setDrawColor(220, 226, 232);
    doc.line(M, y - 8, M + W, y - 8);
    line(text.toUpperCase(), { size: 11, style: 'bold', color: [194, 65, 12] });
    y += 2;
  };

  line('PROPOSAL', { size: 22, style: 'bold', color: [15, 23, 42], gap: 24 });
  line(saleTitle || 'Estate sale services', { size: 13, style: 'bold', gap: 18 });
  line(`Prepared ${proposal.finalized_at ? new Date(proposal.finalized_at).toLocaleDateString() : new Date().toLocaleDateString()} · Version ${proposal.version}`, { size: 9, color: [100, 116, 139] });

  heading('Project overview');
  line(`Client: ${s.client?.name || 'Not recorded'}`);
  line(`Property: ${[s.property?.street, s.property?.city, s.property?.state, s.property?.zip].filter(Boolean).join(', ') || 'Not recorded'}`);
  line(`Sale dates: ${(s.sale_dates || []).map(dateLine).join(' · ') || 'Not yet scheduled'}`);
  if (s.overview) line(s.overview);

  heading('Recommended services');
  if (s.recommended_services?.length) {
    s.recommended_services.forEach(r => line(`• ${r.name}${r.description ? ` — ${r.description}` : ''}`));
  } else line('Not yet recorded.', { color: [100, 116, 139] });

  heading('Scope of work');
  line(`Included: ${s.scope_summary?.included?.join(', ') || 'Not yet recorded'}`);
  line(`Not included: ${s.scope_summary?.excluded?.join(', ') || 'None recorded'}`);
  if (s.scope_summary?.optional?.length) line(`Optional / additional (only when you authorize): ${s.scope_summary.optional.join(', ')}`);

  heading('Sale strategy');
  line(s.sale_strategy || 'Not yet recorded.', s.sale_strategy ? {} : { color: [100, 116, 139] });
  if (s.property_considerations) line(`Property considerations: ${s.property_considerations}`);

  heading('Estimated sale range');
  const r = s.estimated_range || {};
  if (r.low && r.high) line(`Estimated range: ${money(r.low)} – ${money(r.high)}`);
  else if (r.low || r.high) line(`Working estimate: ${money(r.low || r.high)}`);
  else if (r.working_estimate) line(`Working estimate: ${money(r.working_estimate)}`);
  else line('Estimate not yet recorded — UNKNOWN, not zero.', { color: [100, 116, 139] });
  line(s.estimate_note || ESTIMATE_NOTE, { size: 9, color: [100, 116, 139] });

  heading('Compensation');
  line(`Commission: ${s.compensation?.commission_rate != null ? `${s.compensation.commission_rate}% of gross merchandise sales` : 'Not yet recorded'}`);
  line(`Minimum fee: ${money(s.compensation?.minimum_fee) || 'Not recorded'}${s.compensation?.minimum_fee ? ' (applied as the greater of commission or minimum)' : ''}`);

  heading('Additional services');
  if (s.additional_services?.length) {
    s.additional_services.forEach(a => line(`• ${a.name}${a.description ? ` — ${a.description}` : ''}${a.charge_policy ? ` (${a.charge_policy})` : ''}`));
  } else line('None proposed.', { color: [100, 116, 139] });

  heading('Discount approach');
  line(s.discount_approach || 'Not yet recorded.', s.discount_approach ? {} : { color: [100, 116, 139] });

  heading('Post-sale plan');
  line(s.post_sale_plan?.default_outcome ? (OUTCOME_LABELS[s.post_sale_plan.default_outcome] || s.post_sale_plan.default_outcome) : 'Not yet recorded.');
  if (s.post_sale_plan?.notes) line(s.post_sale_plan.notes);

  heading('Next steps');
  line(s.next_steps || 'Review this proposal, confirm the scope and terms, then we prepare the agreement for signature.', s.next_steps ? {} : { color: [100, 116, 139] });

  y += 6;
  line(`This proposal reflects what was proposed on ${proposal.finalized_at ? new Date(proposal.finalized_at).toLocaleDateString() : 'this date'} (version ${proposal.version}). It is a planning document, not an agreement.`, { size: 8, color: [148, 163, 184] });

  doc.save(`proposal-v${proposal.version}${s.client?.name ? `-${s.client.name.replace(/\s+/g, '_')}` : ''}.pdf`);
}