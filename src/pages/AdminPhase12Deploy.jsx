import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Rocket, CheckCircle2, AlertCircle, MapPin, Globe, Map } from 'lucide-react';

const DEPLOYMENT_PLAN = [
  { category: 'State Guides (NJ)', items: ['/probate/new-jersey', '/inherited-property/new-jersey', '/estate-cleanout/new-jersey', '/senior-downsizing/new-jersey', '/moving-sale/new-jersey'] },
  { category: 'County Probate Pages (10)', items: ['Monmouth','Ocean','Middlesex','Bergen','Essex','Morris','Union','Hudson','Mercer','Burlington'].map(c => `/probate/new-jersey/${c.toLowerCase()}-county`) },
  { category: 'Estate Sale County Pages (3)', items: ['/estate-sale-companies/new-jersey/monmouth-county', '/estate-sale-companies/new-jersey/ocean-county', '/estate-sale-companies/new-jersey/middlesex-county'] },
  { category: 'Probate Realtor County Pages (3)', items: ['/probate-realtors/new-jersey/monmouth-county', '/probate-realtors/new-jersey/ocean-county', '/probate-realtors/new-jersey/middlesex-county'] },
  { category: 'NJ Lead Magnets (4)', items: ['Probate Checklist — NJ', 'Inherited Home Checklist — NJ', 'Estate Sale Prep Checklist — NJ', 'Executor First Steps — NJ'] },
];

function SummaryCard({ label, value, IconEl, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <IconEl className="w-4 h-4" />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminPhase12Deploy() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleDeploy = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    const res = await base44.functions.invoke('deployNJPhase12', {});
    setRunning(false);
    if (res.data?.success) {
      setResult(res.data);
    } else {
      setError(res.data?.error || 'Deployment failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Phase 12 — NJ Content Deployment</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generates all New Jersey draft content: 5 state guides, 10 county probate pages, 3 estate sale + 3 realtor county pages, and 4 NJ lead magnets.
          <strong className="text-amber-600"> All saved as draft. Nothing auto-publishes.</strong>
        </p>
      </div>

      {/* Deployment plan preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DEPLOYMENT_PLAN.map(section => (
          <Card key={section.category}>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-slate-600 mb-2">{section.category}</p>
              <div className="space-y-1">
                {section.items.map(item => (
                  <p key={item} className="text-xs text-slate-500 font-mono">{item}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <strong>Important:</strong> This process makes ~21 AI generation calls and may take 3–6 minutes. Do not close this page while running.
      </div>

      {!result && (
        <Button onClick={handleDeploy} disabled={running} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 text-base gap-3">
          {running
            ? <><Loader2 className="w-5 h-5 animate-spin" />Generating NJ content... (~3-6 min)</>
            : <><Rocket className="w-5 h-5" />Deploy Phase 12 — New Jersey Content</>}
        </Button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />{error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="State Guides" value={result.summary.state_guides_created} IconEl={Globe} color="bg-blue-50 border-blue-200 text-blue-800" />
            <SummaryCard
              label="County Guides"
              value={result.summary.county_guides_created + result.summary.estate_sale_county_guides_created + result.summary.realtor_county_guides_created}
              IconEl={MapPin}
              color="bg-green-50 border-green-200 text-green-800"
            />
            <SummaryCard label="Lead Magnets" value={result.summary.lead_magnets_created} IconEl={CheckCircle2} color="bg-amber-50 border-amber-200 text-amber-800" />
            <SummaryCard label="Sitemap Queued" value={result.summary.sitemap_queued} IconEl={Map} color="bg-purple-50 border-purple-200 text-purple-800" />
          </div>

          <div className="flex gap-3 flex-wrap">
            <Badge className="bg-green-100 text-green-700 border-green-200">{result.summary.total_pages} total pages</Badge>
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">All saved as draft</Badge>
            <Badge className="bg-slate-100 text-slate-600 border-slate-200">Auto-publish: OFF</Badge>
            {result.summary.error_count > 0 && <Badge className="bg-red-100 text-red-600 border-red-200">{result.summary.error_count} errors</Badge>}
          </div>

          {/* Missing providers */}
          <Card className="border-orange-200">
            <CardContent className="p-5">
              <p className="text-sm font-bold text-orange-700 mb-3">⚠ Missing Provider Assignments</p>
              <p className="text-xs text-slate-600 mb-2">Assign these in the Territory Launch Engine or Provider Directory to activate provider-match CTAs:</p>
              <div className="space-y-1">
                {result.summary.missing_provider_assignments.map((note, i) => (
                  <p key={i} className="text-xs text-orange-600 font-mono">• {note}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed results */}
          <div className="space-y-4">
            {[
              { key: 'state_guides', label: 'State Guides', nameKey: 'type' },
              { key: 'county_guides', label: 'County Probate Guides', nameKey: 'county' },
              { key: 'estate_sale_county_guides', label: 'Estate Sale County Guides', nameKey: 'county' },
              { key: 'realtor_county_guides', label: 'Probate Realtor County Guides', nameKey: 'county' },
              { key: 'lead_magnets', label: 'Lead Magnets', nameKey: 'title' },
            ].map(section => (
              <div key={section.key}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{section.label}</p>
                <div className="space-y-1">
                  {(result.details[section.key] || []).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded px-3 py-2">
                      {r.success
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <span className="font-medium text-slate-700">{r[section.nameKey]}</span>
                      {r.seo_title && <span className="text-slate-400 truncate flex-1">{r.seo_title}</span>}
                      {r.item_count != null && <span className="text-slate-400">{r.item_count} items</span>}
                      <Badge className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 shrink-0">draft</Badge>
                      {r.error && <span className="text-red-500 truncate">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sitemap queue */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Sitemap Queue ({result.sitemap_queue?.filter(r => r.queued).length} new entries)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {(result.sitemap_queue || []).map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded px-2 py-1">
                  {r.queued
                    ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    : <span className="w-3 h-3 text-slate-300 shrink-0">—</span>}
                  <span className="font-mono text-slate-500 truncate">{r.url}</span>
                  {r.note && <span className="text-slate-400 text-xs">{r.note}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
            <strong>Phase 12 Complete.</strong> All content saved as draft. Review in AdminContentEngine → State Content and County Content tabs.
            Publish manually after review. Next: assign providers in Territory Launch Engine, then submit sitemap.
          </div>
        </div>
      )}
    </div>
  );
}