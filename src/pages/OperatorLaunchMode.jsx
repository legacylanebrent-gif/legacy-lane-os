import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LAUNCH_PHASES, PHASE_LABELS, buildReadinessItems, readinessStatus,
  deriveLaunchPhase, graduationEligibility, daysSince,
} from '@/components/launchmode/launchModel';
import ReadinessCard from '@/components/launchmode/ReadinessCard';
import BaselineCard from '@/components/launchmode/BaselineCard';
import FirstSaleFitCard from '@/components/launchmode/FirstSaleFitCard';
import FirstProjectCard from '@/components/launchmode/FirstProjectCard';
import ImprovementCard from '@/components/launchmode/ImprovementCard';
import Day90ReviewCard from '@/components/launchmode/Day90ReviewCard';
import QuarterTwoCard from '@/components/launchmode/QuarterTwoCard';
import GraduationCard from '@/components/launchmode/GraduationCard';

// Chapter 27 P1 — OPERATOR 90-DAY LAUNCH MODE.
// An ORCHESTRATION LAYER over the certified EstateSalen operating system —
// never a second system. It answers WHAT MATTERS NOW / WHAT COMES NEXT /
// WHAT IS BLOCKING ME / WHAT CAN WAIT by DERIVING milestones from canonical
// records; only non-derivable state (launch start, Day 1 baseline,
// acknowledgments, Day 90 review, Quarter Two plan, graduation) is stored on
// Company.launch_mode. No numeric launch score exists anywhere.

const pageOf = (p) => p?.items || p || [];

export default function OperatorLaunchMode() {
  const [me, setMe] = useState(null);
  const [company, setCompany] = useState(null);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gateNote, setGateNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const user = await base44.auth.me();
      setMe(user);
      const companies = pageOf(await base44.entities.Company.list('-created_date', 50));
      // SECURITY: only the operator's OWN company is ever used — never fall back
      // to an arbitrary readable company (admins can read all companies via RLS).
      const mine = companies.find(c => c.primary_contact_user_id === user.id)
        || companies.find(c => (c.member_user_ids || []).includes(user.id))
        || null;
      setCompany(mine);
      const [services, documents, compliance, equipment, sales, deals, labor, issues] = await Promise.all([
        base44.entities.OperatorService.filter({ operator_id: user.id }, { limit: 100 }).catch(() => []),
        base44.entities.BusinessDocument.filter({ operator_id: user.id }, { limit: 100 }).catch(() => []),
        base44.entities.ComplianceQuestion.filter({ operator_id: user.id }, { limit: 100 }).catch(() => []),
        base44.entities.EquipmentAsset.filter({ operator_id: user.id }, { limit: 50 }).catch(() => []),
        base44.entities.EstateSale.filter({ operator_id: user.id }, { sort: '-created_date', limit: 50 }).catch(() => []),
        base44.entities.SaleConversionPipeline.filter({ operator_id: user.id }, { limit: 100 }).catch(() => []),
        base44.entities.LaborEntry.filter({ operator_id: user.id }, { limit: 500 }).catch(() => []),
        base44.entities.SaleIssue.filter({ operator_id: user.id, source_label: 'Process observation', status: { $in: ['OPEN', 'WAITING'] } }, { limit: 50 }).catch(() => []),
      ]);
      setData({
        services: pageOf(services), documents: pageOf(documents), compliance: pageOf(compliance),
        equipment: pageOf(equipment), sales: pageOf(sales), deals: pageOf(deals),
        labor: pageOf(labor), issues: pageOf(issues),
      });
    } catch (e) {
      setError('Could not load Launch Mode. Please refresh.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const launch = company?.launch_mode || null;

  const saveLaunch = async (patch) => {
    setSaving(true);
    try {
      const next = { ...(company.launch_mode || {}), ...patch };
      await base44.entities.Company.update(company.id, { launch_mode: next });
      setCompany(c => ({ ...c, launch_mode: next }));
    } catch (e) {
      setError('Could not save. Please try again.');
    }
    setSaving(false);
  };

  const startLaunch = async () => {
    setSaving(true); setError('');
    try {
      let co = company;
      if (!co) {
        co = await base44.entities.Company.create({
          legal_name: (me.company_name || `${me.full_name || 'New'} Estate Sale Company`).trim(),
          primary_contact_user_id: me.id,
        });
        setCompany(co);
      }
      const next = {
        ...(co.launch_mode || {}),
        mode: 'ACTIVE', started_at: new Date().toISOString(), started_by: me.id, started_by_name: me.full_name || 'Operator',
      };
      await base44.entities.Company.update(co.id, { launch_mode: next });
      setCompany(c => ({ ...c, launch_mode: next }));
    } catch (e) {
      setError('Could not start Launch Mode. Please try again.');
    }
    setSaving(false);
  };

  const saveBaseline = async ({ baseline: assumptions, amendReason }) => {
    setSaving(true);
    try {
      const lm = company.launch_mode || {};
      if (lm.baseline?.recorded_at) {
        await saveLaunch({
          baseline_history: [...(lm.baseline_history || []), {
            recorded_at: lm.baseline.recorded_at, version: lm.baseline.version, assumptions: lm.baseline.assumptions,
            superseded_at: new Date().toISOString(), superseded_by_name: me.full_name,
            amendment_reason: amendReason || 'Amended by operator',
          }],
          baseline: {
            recorded_at: new Date().toISOString(), recorded_by: me.id, recorded_by_name: me.full_name,
            version: (lm.baseline.version || 1) + 1, assumptions,
          },
        });
      } else {
        await saveLaunch({
          baseline: { recorded_at: new Date().toISOString(), recorded_by: me.id, recorded_by_name: me.full_name, version: 1, assumptions },
        });
      }
    } finally { setSaving(false); }
  };

  const acknowledgeCriticals = async () => {
    const unresolved = items.filter(i => i.tier === 'CRITICAL' && !i.complete).map(i => i.label);
    await saveLaunch({
      criticals_acknowledged: [...(launch.criticals_acknowledged || []), {
        at: new Date().toISOString(), by: me.id, by_name: me.full_name, unresolved, note: gateNote || '',
      }],
    });
    setGateNote('');
  };

  const completeDay90 = async ({ learned_note, needs_work_note, comparisons }) => {
    await saveLaunch({
      day90_review: {
        completed_at: new Date().toISOString(), completed_by: me.id, completed_by_name: me.full_name,
        comparisons: comparisons.map(r => ({ key: r.key, label: r.label, expected: r.expected, actual: r.actual, classification: r.classification })),
        learned_note, needs_work_note,
      },
    });
  };

  const saveQuarterTwo = async ({ priorities, goals, review_point, note }) => {
    await saveLaunch({
      quarter_two: { created_at: new Date().toISOString(), created_by: me.id, created_by_name: me.full_name, priorities, goals, review_point, note },
    });
  };

  const graduate = async () => {
    await saveLaunch({
      mode: 'GRADUATED', graduated_at: new Date().toISOString(), graduated_by: me.id, graduated_by_name: me.full_name,
      graduation_note: 'Graduated from 90-Day Launch Mode to the normal EstateSalen operating system.',
    });
  };

  const recordNotApplicable = async (note) => {
    await saveLaunch({
      first_project_not_applicable: { at: new Date().toISOString(), by: me.id, by_name: me.full_name, note },
    });
  };

  // ── derivation ──
  const items = me ? buildReadinessItems({ user: me, company, services: data.services, documents: data.documents, complianceQuestions: data.compliance, equipment: data.equipment, launch }) : [];
  const status = readinessStatus(items);
  // LAUNCH WINDOW: only records created after launch start count as launch evidence.
  const startedMs = launch?.started_at ? new Date(launch.started_at).getTime() : 0;
  const inWindow = (r) => !startedMs || !r.created_date || new Date(r.created_date).getTime() >= startedMs;
  const launchSales = (data.sales || []).filter(inWindow);
  const launchDeals = (data.deals || []).filter(inWindow);
  const launchSaleIds = new Set(launchSales.map(s => s.id));
  const launchLabor = (data.labor || []).filter(l => launchSaleIds.has(l.sale_id));
  const completedSales = launchSales.filter(s => s.status === 'completed' || s.transition?.transition_completed_at);
  const firstCompleted = completedSales[0] || null;
  const [firstReviewDone, setFirstReviewDone] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!firstCompleted) { if (alive) setFirstReviewDone(false); return; }
      try {
        const recaps = pageOf(await base44.entities.SaleRecap.filter({ operator_id: me?.id }, { limit: 100 }));
        const r = recaps.find(x => x.sale_id === firstCompleted.id);
        if (alive) setFirstReviewDone(!!(r?.post_sale_review?.recorded_at));
      } catch { if (alive) setFirstReviewDone(false); }
    })();
    return () => { alive = false; };
  }, [firstCompleted?.id, me?.id, data.issues?.length]);

  const phaseInfo = me && launch
    ? deriveLaunchPhase({ launch, readinessItems: items, deals: launchDeals, sales: launchSales, firstReviewDone })
    : { phase: 'NOT_STARTED', why: '' };
  const eligibility = launch
    ? graduationEligibility({ readinessItems: items, launch, sales: launchSales, firstReviewDone })
    : [];

  // Day 90 actuals — derived from canonical records, never fabricated.
  const actuals = (() => {
    const labor = launchLabor;
    const hasCompleted = completedSales.length > 0;
    const laborHours = labor.reduce((s, l) => s + (Number(l.hours) || 0), 0);
    const ownerHours = labor.filter(l => l.is_owner_time).reduce((s, l) => s + (Number(l.hours) || 0), 0);
    const companyRevenue = completedSales.reduce((s, x) => s + (Number(x.commission_earned) || 0), 0);
    const sources = launchDeals.map(d => d.referral_source_type).filter(Boolean);
    const top = sources.length ? Object.entries(sources.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])[0][0] : '';
    const svc = (data.services || []).filter(s => s.enabled !== false).map(s => s.display_name || s.service_type).slice(0, 3).join(', ');
    return {
      hasCompletedSales: hasCompleted, completedSales: completedSales.length,
      // No labor entries recorded = NOT RECORDED (unknown), never a silent $0/0h fact.
      hasLaborData: labor.length > 0, laborHours, ownerHours, companyRevenue,
      topLeadSource: top || '', actualServiceModel: svc || '',
    };
  })();

  const activeSales = launchSales.filter(s => s.activation?.activated_at || ['upcoming', 'active', 'completed'].includes(s.status));
  const firstSale = activeSales[0] || firstCompleted || null;
  const phaseIdx = LAUNCH_PHASES.findIndex(p => p.key === phaseInfo.phase);
  const showFit = launch && ['CONSULTATIONS', 'FIRST_SALE_SELECTION'].includes(phaseInfo.phase) && launchDeals.length > 0;
  const showProject = launch && ['FIRST_PROJECT', 'CLOSEOUT', 'LEARNING', 'QUARTER_TWO', 'READY_TO_GRADUATE', 'GRADUATED'].includes(phaseInfo.phase);
  const showReviewTools = launch && ['LEARNING', 'QUARTER_TWO', 'READY_TO_GRADUATE', 'GRADUATED'].includes(phaseInfo.phase);
  const criticalsOpen = items.filter(i => i.tier === 'CRITICAL' && !i.complete);
  const lastAck = launch?.criticals_acknowledged?.[launch.criticals_acknowledged.length - 1];
  const phaseLabel = PHASE_LABELS[phaseInfo.phase] || LAUNCH_PHASES[phaseIdx]?.label || phaseInfo.phase;

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan-600" /></div>;
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-cyan-700 to-cyan-900 rounded-xl p-4 sm:p-5 text-white space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-cyan-200 flex items-center gap-1.5"><Rocket className="w-3 h-3" /> Operator 90-Day Launch Mode</p>
            <h1 className="text-xl sm:text-2xl font-serif font-bold">{phaseLabel}</h1>
          </div>
          {launch?.mode && (
            <div className="flex flex-col items-start sm:items-end gap-1">
              <Badge className={status.tone === 'red' ? 'bg-red-100 text-red-700' : status.tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}>{status.status}</Badge>
              <p className="text-[10px] text-cyan-200">Day {daysSince(launch.started_at) ?? 0}{launch.mode === 'GRADUATED' ? ' · GRADUATED' : ''}</p>
            </div>
          )}
        </div>
        {launch?.mode && <p className="text-xs text-cyan-100">{phaseInfo.why}</p>}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>}

      {!launch?.mode ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-800">You do not need the finished version of the company before you begin.</p>
          <p className="text-xs text-slate-600">
            Launch Mode sequences the EstateSalen operating system for your first 90 days: foundation → market entry →
            consultations → first-sale selection → first project → closeout → learning → Quarter Two. It shows what matters
            NOW, what can wait, and what is actually blocking you — using the real systems, not a startup wizard.
          </p>
          <p className="text-[11px] text-slate-500">Responsibly ready ≠ perfect. Not perfect ≠ not ready. Not responsibly ready ≠ ready enough.</p>
          <Button onClick={startLaunch} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}Start Launch Mode</Button>
        </div>
      ) : (
        <>
          {/* WHAT MATTERS NOW */}
          <div className="bg-white border-2 border-cyan-200 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-cyan-600 font-semibold">What matters now</p>
            {criticalsOpen.length ? (
              <p className="text-sm text-slate-800 mt-1">{criticalsOpen[0].label} — then keep moving. {status.why}</p>
            ) : launchDeals.length === 0 ? (
              <p className="text-sm text-slate-800 mt-1">
                Foundation is addressed — stop setting up and go talk to sellers. Your next milestone is the FIRST CONSULTATION.
              </p>
            ) : phaseInfo.phase === 'FIRST_PROJECT' ? (
              <p className="text-sm text-slate-800 mt-1">Run your first project on the full system — the roadmap below is your position. Don't abandon the system when it gets busy.</p>
            ) : (
              <p className="text-sm text-slate-800 mt-1">{phaseInfo.why}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {launchDeals.length === 0 && !criticalsOpen.length && (
                <>
                  <Link to="/ProfessionalNetwork" className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">Build referral relationships →</Link>
                  <Link to="/SaleConversionPipeline" className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">Capture your first opportunity →</Link>
                </>
              )}
            </div>
          </div>

          {/* LAUNCH GATE — acknowledge, never a fake legal block */}
          {criticalsOpen.length > 0 && launch.mode === 'ACTIVE' && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-amber-900 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Launch Gate — {criticalsOpen.length} unresolved launch-critical item(s)</p>
              <ul className="space-y-0.5">{criticalsOpen.map(i => <li key={i.id} className="text-[11px] text-amber-800">• {i.label}</li>)}</ul>
              <p className="text-[10px] text-amber-700">
                Existing operational, security, payment and authority protections elsewhere in EstateSalen still apply and are untouched.
                Acknowledging records that YOU chose to proceed knowing what is unresolved — it never makes you ready and never declares compliance.
              </p>
              {lastAck && (
                <p className="text-[10px] text-amber-600">
                  Last acknowledged {new Date(lastAck.at).toLocaleDateString()}: {lastAck.unresolved.join('; ')}{lastAck.note ? ` — "${lastAck.note}"` : ''}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-1.5">
                <input className="flex-1 text-xs border rounded-lg p-1.5 bg-white" value={gateNote} onChange={(e) => setGateNote(e.target.value)} placeholder="Why are you proceeding? (recorded)" />
                <Button size="sm" variant="outline" className="text-xs" disabled={saving} onClick={acknowledgeCriticals}>Acknowledge & proceed</Button>
              </div>
            </div>
          )}

          <ReadinessCard items={items} status={status} />
          <BaselineCard launch={launch} saving={saving} onSave={saveBaseline} />
          {showFit && <FirstSaleFitCard deals={launchDeals} />}
          {showProject && <FirstProjectCard firstSale={firstSale} phase={phaseInfo.phase} deals={launchDeals} />}
          {launchSales.length > 0 && (
            <ImprovementCard sales={launchSales} issues={data.issues} onResolved={load} />
          )}
          {showReviewTools && (
            <>
              <Day90ReviewCard launch={launch} actuals={actuals} saving={saving} onComplete={completeDay90} />
              <QuarterTwoCard launch={launch} saving={saving} onSave={saveQuarterTwo} />
            </>
          )}
          {['QUARTER_TWO', 'READY_TO_GRADUATE', 'GRADUATED'].includes(phaseInfo.phase) && (
            <GraduationCard eligibility={eligibility} launch={launch} saving={saving} onGraduate={graduate} onNotApplicable={recordNotApplicable} />
          )}
          {launch.mode === 'GRADUATED' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">Welcome to the normal EstateSalen operating system</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/OperatorDashboard" className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">Owner Dashboard →</Link>
                <Link to="/MySales" className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">My Sales →</Link>
                <Link to="/SaleConversionPipeline" className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5">Pipeline →</Link>
              </div>
            </div>
          )}

          {/* PROGRESS — milestones derived from canonical records */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Progress — milestones (derived from your real records)</p>
            <ol className="mt-2 space-y-1">
              {LAUNCH_PHASES.map((p, i) => (
                <li key={p.key} className={`flex items-center gap-2 text-[11px] ${i < phaseIdx ? 'text-green-700' : i === phaseIdx ? 'text-cyan-800 font-semibold' : 'text-slate-400'}`}>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${i < phaseIdx ? 'bg-green-100 border-green-300' : i === phaseIdx ? 'bg-cyan-100 border-cyan-400' : 'border-slate-300'}`}>{i < phaseIdx ? '✓' : i + 1}</span>
                  {p.label}{i === phaseIdx && <Badge className="bg-cyan-100 text-cyan-700 border border-cyan-200 text-[9px]">CURRENT</Badge>}
                </li>
              ))}
            </ol>
            <p className="text-[10px] text-slate-400 mt-2">Weeks are guidance. Progress is evidence — calendar time alone never advances you.</p>
          </div>
        </>
      )}
    </div>
  );
}