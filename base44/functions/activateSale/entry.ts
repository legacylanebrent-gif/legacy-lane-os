// Chapter 13 P1 — ONE-CLICK SALE ACTIVATION (P1-1..P1-10).
// Turns ACCEPTED BUSINESS (a SaleConversionPipeline deal) into an EXECUTABLE
// PROJECT (an EstateSale) WITHOUT re-typing established truth:
//   client/property/address/dates/commission are DERIVED from the deal and the
//   ACCEPTED proposal snapshot; goals/conditions/economics/authority stay on
//   their canonical records and are REFERENCED, never copied.
// IDEMPOTENT (P1-3): a deal already linked to a sale, or a sale already
// activated from this deal, routes to that sale — repeated clicks/refreshes/
// retries never create a duplicate EstateSale. IMMUTABLE (P1-6): activation
// never writes to proposals, accepted-terms provenance, or agreements.
// GATE (P1-2): deterministic requirements (client + property identified);
// advisory warnings (no accepted terms, no agreement, no dates) require an
// explicit operator confirmation — the project is never activated silently
// incomplete. DOCTRINE: ACTIVATION INHERITS; DO NOT TYPE THE SAME TRUTH TWICE.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jerr, pageOf } from '../../shared/saleAccess.ts';
import { ACTIVATION_TASKS } from '../../shared/saleActivationTemplate.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return jerr('unauthorized', 'Authentication required', 401);
    const service = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const dealId = body.deal_id;
    if (!dealId) return jerr('deal_id_required', 'deal_id is required', 400);

    const deal = await service.entities.SaleConversionPipeline.get(dealId).catch(() => null);
    if (!deal) return jerr('deal_not_found', 'Opportunity not found', 404);
    if (deal.operator_id !== user.id && user.role !== 'admin') {
      return jerr('not_authorized', 'Caller does not own this opportunity', 403);
    }

    // ── IDEMPOTENCY: route to the active project instead of duplicating ──
    if (deal.estate_sale_id) {
      const existing = await service.entities.EstateSale.get(deal.estate_sale_id).catch(() => null);
      if (existing) {
        const taskCount = await ensureTasks(service, existing);
        return Response.json({
          ok: true, already_active: true, sale_id: existing.id,
          warnings: [], task_count: taskCount,
          message: 'This opportunity already has an active project.',
        });
      }
    }
    const prior = pageOf(await service.entities.EstateSale.filter({ source_deal_id: deal.id }, { limit: 5 }));
    if (prior.length > 0) {
      const sale = prior[0];
      await service.entities.SaleConversionPipeline.update(deal.id, { estate_sale_id: sale.id }).catch(() => {});
      const taskCount = await ensureTasks(service, sale);
      return Response.json({
        ok: true, already_active: true, sale_id: sale.id,
        warnings: [], task_count: taskCount,
        message: 'Re-linked the project previously activated from this opportunity.',
      });
    }

    // ── GATE: deterministic requirements + honest advisory warnings ──
    const missing = [];
    if (!deal.client_name || !String(deal.client_name).trim()) {
      missing.push('Client is not identified on the opportunity (client name missing).');
    }
    const hasProperty = (deal.property_address && String(deal.property_address).trim()) ||
      (deal.property_city && String(deal.property_city).trim());
    if (!hasProperty) missing.push('Property is not identified on the opportunity (address missing).');

    let proposal = null;
    if (deal.accepted_proposal_id) {
      proposal = await service.entities.SaleProposal.get(deal.accepted_proposal_id).catch(() => null);
    }
    const agreements = pageOf(await service.entities.SaleAgreement.filter({ deal_id: deal.id }, { sort: '-created_date', limit: 10 }));
    const agreement = agreements.find(a => a.status === 'EXECUTED') || agreements.find(a => a.status === 'READY') || null;

    const warnings = [];
    if (!deal.commercial_terms_accepted_at && !proposal) {
      warnings.push('Commercial terms are not recorded as accepted — activating without accepted terms.');
    }
    if (!agreement) {
      warnings.push('No executed or ready agreement on this deal — activation proceeds on operator judgment (this is not a legal conclusion).');
    }
    const snapDates = ((proposal && proposal.snapshot && proposal.snapshot.sale_dates) || []).filter(d => d && d.date);
    const hasDates = snapDates.length > 0 || deal.estimated_sale_start_date;
    if (!hasDates) warnings.push('No sale dates scheduled yet — the project will start UNSCHEDULED (dates can be set any time).');

    if (missing.length > 0) {
      return Response.json({ ok: false, activated: false, missing, warnings });
    }
    if (warnings.length > 0 && !body.confirm_warnings) {
      return Response.json({ ok: false, needs_warning_confirmation: true, missing: [], warnings });
    }

    // ── FIELD HANDOFF: derive, never re-type (P1-5) ──
    const snapProp = (proposal && proposal.snapshot && proposal.snapshot.property) || {};
    const propertyAddress = {
      street: snapProp.street || String(deal.property_address || '').trim(),
      city: snapProp.city || String(deal.property_city || '').trim(),
      state: snapProp.state || String(deal.property_state || '').trim(),
      zip: snapProp.zip || '',
    };
    let saleDates = snapDates.map(d => ({ date: d.date, start_time: d.start_time || '', end_time: d.end_time || '' }));
    if (saleDates.length === 0 && deal.estimated_sale_start_date) {
      saleDates.push({ date: deal.estimated_sale_start_date, start_time: '', end_time: '' });
      if (deal.estimated_sale_end_date && deal.estimated_sale_end_date !== deal.estimated_sale_start_date) {
        saleDates.push({ date: deal.estimated_sale_end_date, start_time: '', end_time: '' });
      }
    }
    const cityBit = propertyAddress.city ? ` (${propertyAddress.city})` : '';
    const title = `${deal.client_name} — Estate Sale${cityBit}`;

    const now = new Date().toISOString();
    const sale = await service.entities.EstateSale.create({
      title,
      description: '',
      sale_type: 'estate_tag_sale_private_home',
      operator_id: deal.operator_id,
      property_address: propertyAddress,
      status: 'draft',
      sale_dates: saleDates,
      commission_rate: (typeof deal.commission_rate === 'number' ? deal.commission_rate : 35),
      referral_source_type: deal.referral_source_type || null,
      referral_source_name: deal.referral_source_name || null,
      source_deal_id: deal.id,
      activation: {
        deal_id: deal.id,
        proposal_id: (proposal && proposal.id) || null,
        agreement_id: agreement ? agreement.id : null,
        activated_at: now,
        activated_by: user.id,
        activated_by_name: user.full_name || '',
      },
      communication_plan: {
        primary_contact_name: String(deal.client_name || '').trim(),
        relationship: 'Client',
        // Preferred method/cadence are UNKNOWN until the operator records them —
        // never invented. Communication preference is NEVER marketing consent (P1-12).
      },
    });
    if (!sale || !sale.id) return jerr('activation_failed', 'Could not create the project', 500);

    // Link the deal (the canonical link) and advance the stage honestly.
    const stagePatch = { estate_sale_id: sale.id };
    if (['new_lead', 'contacted', 'consultation_scheduled'].includes(deal.stage)) stagePatch.stage = 'setup_in_progress';
    await service.entities.SaleConversionPipeline.update(deal.id, stagePatch).catch(e => console.error('link deal failed:', e && e.message));

    const taskCount = await ensureTasks(service, sale);

    return Response.json({
      ok: true, activated: true, sale_id: sale.id, warnings, task_count: taskCount,
    });
  } catch (error) {
    console.error('activateSale error:', error && error.message);
    return jerr('internal_error', 'Unexpected error during activation', 500);
  }
}

// ── ONBOARDING LAUNCH (P1-9/P1-10): idempotent template seeding on the
// canonical SaleTask substrate. Repeated activation adds NOTHING.
async function ensureTasks(service, sale) {
  const existing = pageOf(await service.entities.SaleTask.filter({ sale_id: sale.id }, { limit: 500 }));
  const names = new Set(existing.map(t => String(t.name || '').toLowerCase()));
  const toCreate = ACTIVATION_TASKS.filter(t => !names.has(t.name.toLowerCase()));
  if (toCreate.length === 0) return existing.length;

  const dates = (sale.sale_dates || []).map(d => d && d.date).filter(Boolean).sort();
  const lastDate = dates.length ? dates[dates.length - 1] : null;
  await service.entities.SaleTask.bulkCreate(toCreate.map((t, idx) => {
    const base = {
      name: t.name,
      description: t.description,
      category: t.category,
      sale_id: sale.id,
      operator_id: sale.operator_id,
      sale_team_ids: (sale.sale_team || []),
      status: 'not_started',
      priority: 'medium',
      sort_order: existing.length + idx,
      source_type: 'ONBOARDING_TEMPLATE',
      source_id: sale.id,
      source_label: 'Launched at sale activation (Chapter 13 P1)',
    };
    if (t.name === 'Final Property Walkthrough' && lastDate) base.due_date = lastDate;
    return base;
  })).catch(e => console.error('task seeding failed:', e && e.message));
  return existing.length + toCreate.length;
}