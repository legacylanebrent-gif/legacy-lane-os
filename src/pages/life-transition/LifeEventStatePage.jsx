import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import { ChevronRight, ExternalLink, MapPin } from 'lucide-react';

// Maps URL slug → guide_type for DB lookup
const SLUG_TO_TYPE = {
  'probate': 'probate',
  'inherited-property': 'inherited_home',
  'senior-downsizing': 'downsizing',
  'assisted-living-transition': 'senior_transition',
  'divorce-property-sale': 'divorce',
  'estate-cleanout': 'estate_sale',
  'foreclosure-cleanout': 'general',
  'executor-guide': 'probate',
  'trustee-guide': 'probate',
  'heir-guide': 'inherited_home',
  'moving-sale': 'general',
  'pre-probate': 'probate',
};

const SLUG_TO_LABEL = {
  'probate': 'Probate Guide',
  'inherited-property': 'Inherited Property Guide',
  'senior-downsizing': 'Senior Downsizing Guide',
  'assisted-living-transition': 'Assisted Living Transition Guide',
  'divorce-property-sale': 'Divorce Property Sale Guide',
  'estate-cleanout': 'Estate Cleanout Guide',
  'foreclosure-cleanout': 'Foreclosure Cleanout Guide',
  'executor-guide': 'Executor Guide',
  'trustee-guide': 'Trustee Guide',
  'heir-guide': 'Heir Guide',
  'moving-sale': 'Moving Sale Guide',
  'pre-probate': 'Pre-Probate Guide',
};

export default function LifeEventStatePage() {
  const { lifeEventSlug, stateSlug } = useParams();
  const [guide, setGuide] = useState(null);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);

  const guideType = SLUG_TO_TYPE[lifeEventSlug] || 'general';
  const eventLabel = SLUG_TO_LABEL[lifeEventSlug] || 'Guide';
  const stateName = stateSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  useEffect(() => {
    if (!stateSlug) return;
    Promise.all([
      base44.entities.StateGuide.filter({ state_slug: stateSlug, guide_type: guideType }),
      base44.entities.CountyGuide.filter({ county_slug: { $regex: stateSlug }, guide_type: guideType, status: 'published' })
    ]).then(([guides, counties]) => {
      setGuide(guides[0] || null);
      setCounties(counties.slice(0, 20));
      if (guides[0]?.seo_title) document.title = guides[0].seo_title;
      setLoading(false);
    });
  }, [stateSlug, guideType]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-500">Loading guide...</div></div>;

  const title = guide?.title || `${eventLabel} — ${stateName}`;
  const intro = guide?.intro_content || `Educational guide for ${stateName}. Confirm all requirements with the appropriate court, licensed attorney, or licensed professional.`;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={[
        { label: eventLabel, href: `/${lifeEventSlug}` },
        { label: stateName }
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">{stateName} · {eventLabel}</Badge>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">{title}</h1>
          <p className="text-slate-300 max-w-2xl">{intro}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        <SEDisclaimer />

        {/* Quick Facts */}
        {guide?.quick_facts_json && Object.keys(guide.quick_facts_json).length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h2 className="font-bold text-blue-900 mb-4">{stateName} Quick Facts</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(guide.quick_facts_json).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="font-semibold text-blue-800">{k}:</span> <span className="text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        {guide?.main_content && (
          <div className="prose max-w-none text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: guide.main_content }} />
        )}

        {/* Official resources */}
        {guide?.official_resource_links_json?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Official {stateName} Resources</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {guide.official_resource_links_json.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-sm font-medium text-slate-700">
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" /> {r.label}
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Always confirm current forms and fees directly with the court or agency.</p>
          </div>
        )}

        {/* County selector */}
        {counties.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">County Guides in {stateName}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {counties.map(c => (
                <Link key={c.id} to={`/${lifeEventSlug}/${stateSlug}/${c.county_slug}`}>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-center hover:bg-amber-100 transition-colors text-xs font-medium text-slate-700">
                    {c.county_name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {guide?.faq_json?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently Asked Questions — {stateName}</h2>
            <div className="space-y-3">
              {guide.faq_json.map((f, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{f.question}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead CTA */}
        <SELeadCTA
          lifeEventType={guideType}
          defaultState={stateName}
          sourceUrl={`/${lifeEventSlug}/${stateSlug}`}
          sourcePageType="state_guide"
          ctaTitle={`Get Connected with ${stateName} Experts`}
          ctaDesc={`Tell us about your situation and we'll connect you with estate sale companies, realtors, and other trusted professionals in ${stateName}.`}
        />
      </div>
      <SharedFooter />
    </div>
  );
}