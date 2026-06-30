import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import { ExternalLink, MapPin, Phone } from 'lucide-react';

const SLUG_TO_TYPE = {
  'probate': 'probate', 'inherited-property': 'inherited_home', 'senior-downsizing': 'downsizing',
  'assisted-living-transition': 'senior_transition', 'divorce-property-sale': 'divorce',
  'estate-cleanout': 'estate_sale', 'foreclosure-cleanout': 'general',
  'executor-guide': 'probate', 'trustee-guide': 'probate', 'heir-guide': 'inherited_home',
  'moving-sale': 'general', 'pre-probate': 'probate',
};
const SLUG_TO_LABEL = {
  'probate': 'Probate Guide', 'inherited-property': 'Inherited Property', 'senior-downsizing': 'Senior Downsizing',
  'assisted-living-transition': 'Assisted Living Transition', 'divorce-property-sale': 'Divorce Property Sale',
  'estate-cleanout': 'Estate Cleanout', 'foreclosure-cleanout': 'Foreclosure Cleanout',
  'executor-guide': 'Executor Guide', 'trustee-guide': 'Trustee Guide', 'heir-guide': 'Heir Guide',
  'moving-sale': 'Moving Sale', 'pre-probate': 'Pre-Probate',
};

export default function LifeEventCountyPage() {
  const { lifeEventSlug, stateSlug, countySlug } = useParams();
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);

  const guideType = SLUG_TO_TYPE[lifeEventSlug] || 'general';
  const eventLabel = SLUG_TO_LABEL[lifeEventSlug] || 'Guide';
  const stateName = stateSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const countyName = countySlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    base44.entities.CountyGuide.filter({ county_slug: countySlug, guide_type: guideType })
      .then(guides => {
        setGuide(guides[0] || null);
        if (guides[0]?.seo_title) document.title = guides[0].seo_title;
        setLoading(false);
      });
  }, [countySlug, guideType]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-500">Loading...</div></div>;

  const title = guide?.title || `${eventLabel} — ${countyName}, ${stateName}`;

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">{countyName} · {stateName}</Badge>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">{title}</h1>
          <p className="text-slate-300 max-w-2xl">
            {guide?.intro_content || `Local ${eventLabel.toLowerCase()} resources for ${countyName}, ${stateName}. Confirm all requirements with local court, licensed attorney, or licensed professional.`}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <SEDisclaimer />

        {/* Court info */}
        {guide?.court_info_json && (guide.court_info_json.court_name || guide.court_info_json.address) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h2 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> {countyName} Court Information</h2>
              <div className="space-y-1 text-sm text-slate-700">
                {guide.court_info_json.court_name && <p><strong>Court:</strong> {guide.court_info_json.court_name}</p>}
                {guide.court_info_json.address && <p><strong>Address:</strong> {guide.court_info_json.address}</p>}
                {guide.court_info_json.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {guide.court_info_json.phone}</p>}
                {guide.court_info_json.hours && <p><strong>Hours:</strong> {guide.court_info_json.hours}</p>}
                {guide.court_info_json.url && (
                  <a href={guide.court_info_json.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-1">
                    <ExternalLink className="w-3 h-3" /> Official Court Website
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">Always confirm current hours and requirements directly with the court.</p>
            </CardContent>
          </Card>
        )}

        {guide?.main_content && (
          <div className="prose max-w-none text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: guide.main_content }} />
        )}

        {guide?.faq_json?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">FAQs — {countyName}</h2>
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

        <SELeadCTA
          lifeEventType={guideType}
          defaultState={stateName}
          sourceUrl={`/${lifeEventSlug}/${stateSlug}/${countySlug}`}
          sourcePageType="county_guide"
          ctaTitle={`Get Help in ${countyName}, ${stateName}`}
          ctaDesc={`Connect with estate sale companies, realtors, cleanout vendors, and other professionals serving ${countyName}.`}
        />
      </div>
      <SharedFooter />
    </div>
  );
}