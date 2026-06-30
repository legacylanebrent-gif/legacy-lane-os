import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import SEOHead from '@/components/seo/SEOHead';
import { getHubContent } from '@/data/lifeTransitionHubContent';
import { ChevronRight, ExternalLink, MapPin, Info, AlertCircle, BookOpen } from 'lucide-react';

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
  const sharedContent = getHubContent(lifeEventSlug);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!stateSlug) return;
    Promise.all([
      base44.entities.StateGuide.filter({ state_slug: stateSlug, guide_type: guideType, status: 'published' }),
      base44.entities.CountyGuide.filter({ county_slug: { $regex: stateSlug }, guide_type: guideType, status: 'published' })
    ]).then(([guides, countyGuides]) => {
      setGuide(guides[0] || null);
      setCounties(countyGuides.slice(0, 30));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [stateSlug, guideType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-500">Loading guide...</div>
      </div>
    );
  }

  const seoTitle = guide?.seo_title || `${eventLabel} in ${stateName}: Process, Timeline & Costs`;
  const seoDescription = guide?.seo_description || `Complete ${eventLabel.toLowerCase()} for ${stateName}. Learn the process, timeline, costs, state-specific requirements, and how to handle estate property.`;
  const title = guide?.title || `${eventLabel} — ${stateName}`;

  // Schema for SEO
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ...(sharedContent?.generalFaqs || []).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
      ...(guide?.faq_json || []).map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title={seoTitle} description={seoDescription} jsonLd={faqSchema} />

      <UniversalHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link to={`/${lifeEventSlug}`} className="hover:text-amber-400 transition-colors">{eventLabel}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-amber-400">{stateName}</span>
          </div>
          <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
            <MapPin className="w-3 h-3 mr-1" /> {stateName} · {eventLabel}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4 leading-tight">{title}</h1>
          <p className="text-slate-300 max-w-3xl text-base leading-relaxed">
            {guide?.intro_content || (sharedContent?.overview?.[0] ? `${stateName} ${sharedContent.overview[0]}` : `Educational guide for ${stateName}. Confirm all requirements with the appropriate court, licensed attorney, or licensed professional.`)}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">

        <SEDisclaimer />

        {/* State-specific quick facts — the differentiator */}
        {guide?.quick_facts_json && Object.keys(guide.quick_facts_json).length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-700" />
                <h2 className="font-bold text-blue-900 text-lg">{stateName}-Specific Quick Facts</h2>
              </div>
              <p className="text-sm text-blue-800 mb-4">These facts are specific to {stateName} and may differ from the general process described below. Always verify with your local court.</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(guide.quick_facts_json).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="font-semibold text-blue-800">{k}:</span> <span className="text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
              {guide?.last_verified_date && (
                <p className="text-xs text-blue-600 mt-3">Last verified: {new Date(guide.last_verified_date).toLocaleDateString()}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shared general overview content */}
        {sharedContent?.overview?.map((para, i) => (
          <p key={i} className="text-slate-700 text-base leading-relaxed">{i === 0 && !guide ? para : (i === 0 ? `${stateName} ${para}` : para)}</p>
        ))}

        {/* State-specific main content (if exists — the detailed state differences) */}
        {guide?.main_content && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                <h2 className="font-bold text-amber-900 text-lg">How It Works in {stateName}</h2>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: guide.main_content }} />
            </CardContent>
          </Card>
        )}

        {/* Shared comprehensive sections — same across all states */}
        {sharedContent?.sections?.length > 0 && (
          <div className="space-y-10">
            {sharedContent.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{section.heading}</h2>
                <div className="prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.body }} />
                {section.bullets && (
                  <ul className="mt-4 space-y-2">
                    {section.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-orange-500 flex-shrink-0 mt-0.5">•</span>
                        <span dangerouslySetInnerHTML={{ __html: b }} />
                      </li>
                    ))}
                  </ul>
                )}
                {section.bodyAfterBullets && (
                  <div className="mt-4 prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.bodyAfterBullets }} />
                )}
              </section>
            ))}
          </div>
        )}

        {/* Key terms */}
        {sharedContent?.keyTerms?.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <BookOpen className="w-5 h-5 text-slate-700" />
              <h2 className="text-2xl font-bold text-slate-900">Key Terms to Know</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {sharedContent.keyTerms.map(({ term, definition }) => (
                <div key={term} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="font-semibold text-slate-900 text-sm mb-1">{term}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{definition}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Official state resources */}
        {guide?.official_resource_links_json?.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Official {stateName} Resources</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {guide.official_resource_links_json.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
                  <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" /> {r.label}
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Always confirm current forms and fees directly with the court or agency.</p>
          </section>
        )}

        {/* County selector */}
        {counties.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">County Guides in {stateName}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {counties.map(c => (
                <Link key={c.id} to={`/${lifeEventSlug}/${stateSlug}/${c.county_slug}`}>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-center hover:bg-amber-100 transition-colors text-xs font-medium text-slate-700">
                    {c.county_name}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQs — general national + state-specific */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {guide?.faq_json?.length > 0 && (
              <>
                <p className="text-sm font-semibold text-amber-700">{stateName}-Specific Questions</p>
                {guide.faq_json.map((f, i) => (
                  <div key={`s-${i}`} className="border border-amber-200 rounded-xl p-5 bg-amber-50/30">
                    <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.question}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </>
            )}
            {sharedContent?.generalFaqs?.length > 0 && (
              <>
                <p className="text-sm font-semibold text-slate-500 pt-2">General Questions</p>
                {sharedContent.generalFaqs.map((f, i) => (
                  <div key={`g-${i}`} className="border border-slate-200 rounded-xl p-5">
                    <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.q}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Lead CTA */}
        <SELeadCTA
          lifeEventType={guideType}
          defaultState={stateName}
          sourceUrl={`/${lifeEventSlug}/${stateSlug}`}
          sourcePageType="state_guide"
          ctaTitle={`Get Connected with ${stateName} Experts`}
          ctaDesc={`Tell us about your situation and we'll connect you with estate sale companies, realtors, and other trusted professionals in ${stateName}.`}
        />

        {/* Internal links — back to hub and related state guides */}
        <section className="border-t border-slate-200 pt-8">
          <div className="flex flex-wrap gap-3">
            <Link to={`/${lifeEventSlug}`} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
              ← Back to {eventLabel}
            </Link>
          </div>
        </section>
      </div>
      <SharedFooter />
    </div>
  );
}