// LLBB Website Setup Overview (Phase 4B — Part 2).
// Progress, readiness grouped REQUIRED / RECOMMENDED / OPTIONAL (the server
// engine's blocking / weighted / optional flags), placeholders, last saved,
// setup manager. Optional items never block readiness.
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Circle, AlertCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { READINESS_SECTION_TABS, WORKFLOW_BADGE, WORKFLOW_LABELS, MANAGEMENT_MODE_LABELS } from '@/components/llbb/managerConfig';
import { Badge } from '@/components/ui/badge';

const ICONS = {
  complete: <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />,
  blocking: <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
  incomplete: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />,
  optional: <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
};

export default function StudioOverview({ ov, settings, onNavigate }) {
  const r = ov.readiness || {};
  const required = r.sections.filter(s => s.blocking && s.status !== 'complete');
  const doneRequired = r.sections.filter(s => s.blocking && s.status === 'complete');
  const recommended = r.sections.filter(s => !s.blocking && !s.optional && s.status !== 'complete');
  const optionalTodo = r.sections.filter(s => s.optional && s.status !== 'complete');
  const placeholders = r.placeholders || [];
  const navTab = (key) => READINESS_SECTION_TABS[key] || 'overview';

  const Row = ({ s }) => (
    <li className="px-4 py-2.5 flex items-start gap-3">
      {ICONS[s.status] || ICONS.optional}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-800 flex flex-wrap items-center gap-2">
          {s.blocking && <span className="text-[10px] font-semibold uppercase tracking-wide bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Required</span>}
          {s.optional && <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Optional</span>}
          {s.label}
        </div>
        {s.reason && <div className="text-xs text-slate-500 mt-0.5">{s.reason}</div>}
      </div>
      <button onClick={() => onNavigate(navTab(s.key))} className="text-xs font-medium text-blue-600 hover:underline flex-shrink-0">
        Open <ArrowRight className="w-3 h-3 inline" />
      </button>
    </li>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Headline card */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-slate-900">Website Setup</div>
          <div className="flex-1 min-w-[120px] max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${r.launch_ready ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${r.percent}%` }} />
          </div>
          <div className="text-sm font-bold text-slate-800">{r.percent}%</div>
          <Badge className={WORKFLOW_BADGE[ov.workflow_status]}>{WORKFLOW_LABELS[ov.workflow_status]}</Badge>
        </div>
        <ul className="divide-y divide-slate-100">
          {doneRequired.map(s => <Row key={s.key} s={s} />)}
        </ul>
      </div>

      {/* Required before launch */}
      {required.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 overflow-hidden">
          <div className="px-4 py-3 bg-red-50 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">Required Before Launch</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {required.map(s => <Row key={s.key} s={s} />)}
          </ul>
        </div>
      )}

      {/* Placeholders */}
      {placeholders.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Placeholder Content Detected</span>
          </div>
          <ul className="p-4 space-y-1.5 text-sm text-amber-800">
            {placeholders.map((p, i) => <li key={i}>• {p.detail}</li>)}
          </ul>
        </div>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-800">Recommended</div>
          <ul className="divide-y divide-slate-100">{recommended.map(s => <Row key={s.key} s={s} />)}</ul>
        </div>
      )}

      {/* Optional */}
      {optionalTodo.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-600">Optional Improvements</div>
          <ul className="divide-y divide-slate-100">{optionalTodo.map(s => <Row key={s.key} s={s} />)}</ul>
        </div>
      )}

      {/* Site facts */}
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
        {[
          ['Draft hostname', (ov.domains.find(d => d.domain_type === 'platform_subdomain') || {}).hostname],
          ['Template', `Template #1 (operator_template_1 v${(ov.tenant.template && ov.tenant.template.version) || 1})`],
          ['Management mode', MANAGEMENT_MODE_LABELS[ov.management_mode] || ov.management_mode],
          ['Setup manager', ov.tenant.setup_manager_user_id ? 'Assigned' : 'Not assigned'],
          ['Last saved', settings && settings.updated_date ? new Date(settings.updated_date).toLocaleString() : 'Not saved yet'],
          ['Branding preset', (settings.branding || {}).design_preset || 'Template default']
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-2.5">
            <span className="text-slate-500">{k}</span>
            <span className="font-medium text-slate-900 text-right">{v || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}