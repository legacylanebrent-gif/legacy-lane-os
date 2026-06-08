import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import ChecklistDownloadForm from '@/components/checklist/ChecklistDownloadForm';
import ChecklistViewer from '@/components/checklist/ChecklistViewer';
import ProviderMatchCTA from '@/components/checklist/ProviderMatchCTA';
import { Loader2, ClipboardList } from 'lucide-react';

// Static fallback checklist for probate (used when no DB magnet exists yet)
import { PROBATE_FALLBACK_ITEMS } from '@/components/checklist/fallbackChecklists';

const EVENT_TYPE_MAP = {
  'probate': 'probate',
  'estate-settlement': 'probate',
  'executor-guide': 'executor_guide',
  'executor-first-steps': 'executor_guide',
  'inherited-home': 'inherited_home',
  'inherited-property': 'inherited_home',
  'estate-sale': 'estate_sale',
  'estate-sale-prep': 'estate_sale',
  'senior-downsizing': 'senior_downsizing',
  'downsizing': 'senior_downsizing',
  'assisted-living': 'assisted_living',
  'assisted-living-transition': 'assisted_living',
  'estate-cleanout': 'estate_cleanout',
  'cleanout': 'estate_cleanout',
  'divorce-property': 'divorce_property',
  'divorce': 'divorce_property',
  'foreclosure-cleanout': 'foreclosure_cleanout',
  'foreclosure': 'foreclosure_cleanout',
  'moving-sale': 'moving_sale',
  'moving': 'moving_sale',
};

const EVENT_TYPE_LABELS = {
  probate: 'Probate & Estate Settlement',
  executor_guide: 'Executor First Steps',
  inherited_home: 'Inherited Home Sale',
  estate_sale: 'Estate Sale Preparation',
  senior_downsizing: 'Senior Downsizing',
  assisted_living: 'Assisted Living Transition',
  estate_cleanout: 'Estate Cleanout',
  divorce_property: 'Divorce Property Transition',
  foreclosure_cleanout: 'Foreclosure Cleanout',
  moving_sale: 'Moving Sale',
};

const ALL_CHECKLIST_TYPES = [
  { slug: 'probate', label: 'Probate / Estate' },
  { slug: 'executor-guide', label: 'Executor Steps' },
  { slug: 'inherited-home', label: 'Inherited Home' },
  { slug: 'estate-sale', label: 'Estate Sale Prep' },
  { slug: 'senior-downsizing', label: 'Senior Downsizing' },
  { slug: 'assisted-living', label: 'Assisted Living Move' },
  { slug: 'estate-cleanout', label: 'Estate Cleanout' },
  { slug: 'divorce-property', label: 'Divorce Property' },
  { slug: 'foreclosure-cleanout', label: 'Foreclosure Cleanout' },
  { slug: 'moving-sale', label: 'Moving Sale' },
];

export default function EstateChecklist() {
  const params = useParams();
  const urlParams = new URLSearchParams(window.location.search);

  // Get context from URL params or route params
  const lifeEventSlug = params.lifeEventSlug || urlParams.get('type') || 'probate';
  const stateSlug = params.stateSlug || urlParams.get('state') || '';
  const countySlug = params.countySlug || urlParams.get('county') || '';

  const lifeEventType = EVENT_TYPE_MAP[lifeEventSlug] || 'probate';
  const stateContext = stateSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const countyContext = countySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const eventLabel = EVENT_TYPE_LABELS[lifeEventType] || 'Estate Transition';

  const [magnet, setMagnet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);

  useEffect(() => { loadMagnet(); }, [lifeEventType, stateContext, countyContext]);

  const loadMagnet = async () => {
    setLoading(true);
    try {
      // Try to find exact match first, then fall back to generic
      const allMagnets = await base44.entities.LeadMagnet.filter({ life_event_type: lifeEventType, status: 'active' });
      const exact = allMagnets.find(m => m.state === stateContext && m.county === countyContext);
      const stateLevel = allMagnets.find(m => m.state === stateContext && !m.county);
      const generic = allMagnets.find(m => !m.state);
      const found = exact || stateLevel || generic;
      setMagnet(found || null);
      setChecklistItems(found?.checklist_items_json || PROBATE_FALLBACK_ITEMS);
    } catch (e) {
      setChecklistItems(PROBATE_FALLBACK_ITEMS);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await base44.functions.invoke('generateLeadMagnet', {
      life_event_type: lifeEventType,
      state: stateContext || undefined,
      county: countyContext || undefined,
    });
    if (res.data?.success) {
      await loadMagnet();
    }
    setGenerating(false);
  };

  const handleDownloadSuccess = (data) => {
    setDownloaded(true);
    if (data.checklist_items?.length) setChecklistItems(data.checklist_items);
  };

  const title = magnet?.title || `${eventLabel} Checklist${stateContext ? ` — ${stateContext}` : ''}`;
  const locationStr = countyContext ? `${countyContext}, ${stateContext}` : stateContext || '';

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">Free Resource</Badge>
        <ClipboardList className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">{title}</h1>
        {locationStr && <p className="text-amber-300 text-sm mb-2">{locationStr}</p>}
        <p className="text-slate-300 max-w-xl mx-auto text-sm">
          Step-by-step checklist to help families navigate {eventLabel.toLowerCase()}. 
          Free to use — email it to yourself to save your progress.
        </p>
      </section>

      {/* Checklist type nav */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 max-w-5xl mx-auto">
          {ALL_CHECKLIST_TYPES.map(t => (
            <a key={t.slug} href={`/estate-checklist/${t.slug}${stateSlug ? `/${stateSlug}` : ''}`}
              className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full transition-colors ${lifeEventSlug === t.slug || (lifeEventSlug === 'probate' && t.slug === 'probate') ? 'bg-amber-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              {t.label}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left: Download form */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="border-amber-200 shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-1">Get Your Free Checklist</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Enter your email to receive this checklist + be matched with local professionals.
                </p>
                <ChecklistDownloadForm
                  magnet={magnet}
                  lifeEventType={lifeEventType}
                  stateContext={stateContext}
                  countyContext={countyContext}
                  onSuccess={handleDownloadSuccess}
                />
              </CardContent>
            </Card>

            {/* Generate if missing */}
            {!loading && !magnet && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 text-center">
                <p className="mb-2">No AI checklist generated yet for this type.</p>
                <Button onClick={handleGenerate} disabled={generating} size="sm" variant="outline" className="text-xs">
                  {generating ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Generating...</> : 'Generate AI Checklist'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Checklist viewer */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-8">
              <ChecklistViewer items={checklistItems} title={title} />
              <ProviderMatchCTA
                headline={magnet?.cta_headline}
                body={magnet?.cta_body}
                state={stateContext}
                county={countyContext}
              />
            </div>
          )}
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}