import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEDisclaimer from './SEDisclaimer';
import SELeadCTA from './SELeadCTA';
import SEStateSelector from './SEStateSelector';

/**
 * Reusable hub layout for all life event landing pages.
 * Props:
 *  - title, subtitle, badge, intro
 *  - lifeEventType (for lead form)
 *  - stateRouteSlug (base slug for state selector links, e.g. "probate")
 *  - breadcrumbs
 *  - heroColor: tailwind bg class string
 *  - steps: [{step, title, desc}]
 *  - faqs: [{question, answer}]
 *  - relatedLinks: [{label, href}]
 *  - features: [{icon, color, title, desc}]
 *  - mainContent: ReactNode (optional rich section)
 *  - ctaTitle, ctaDesc
 */
export default function SEHubLayout({
  title, subtitle, badge, intro,
  lifeEventType = 'estate_settlement',
  stateRouteSlug,
  breadcrumbs = [],
  heroAccent = 'text-amber-400',
  steps = [],
  faqs = [],
  relatedLinks = [],
  features = [],
  mainContent = null,
  ctaTitle,
  ctaDesc,
  pageUrl = '',
  pageType = 'life_event_hub',
}) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {badge && <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1">{badge}</span>}
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3 leading-tight">{title}</h1>
          {subtitle && <p className={`text-lg font-medium mb-4 ${heroAccent}`}>{subtitle}</p>}
          <p className="text-slate-300 max-w-2xl mx-auto text-base leading-relaxed">{intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="#get-help"><Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8">Get Free Help</Button></a>
            {stateRouteSlug && <a href="#find-your-state"><Button className="border border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white px-8">Find Your State Guide</Button></a>}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-14">

        {/* Disclaimer */}
        <SEDisclaimer />

        {/* Features / How We Help */}
        {features.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">How EstateSalen Helps</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(({ icon: Icon, color, title: t, desc }) => (
                <Card key={t} className="text-center">
                  <CardContent className="p-5">
                    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mx-auto mb-3`}><Icon className="w-5 h-5" /></div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{t}</h3>
                    <p className="text-xs text-slate-600">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Main content slot */}
        {mainContent && <section>{mainContent}</section>}

        {/* Step by step */}
        {steps.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Step-by-Step Process</h2>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm mb-0.5">{s.title}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* State selector */}
        {stateRouteSlug && (
          <section id="find-your-state">
            <SEStateSelector baseSlug={stateRouteSlug} />
          </section>
        )}

        {/* Lead CTA */}
        <section id="get-help">
          <SELeadCTA
            lifeEventType={lifeEventType}
            sourceUrl={pageUrl}
            sourcePageType={pageType}
            ctaTitle={ctaTitle}
            ctaDesc={ctaDesc}
          />
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.q}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {relatedLinks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Related Guides</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedLinks.map(({ label, href }) => (
                <Link key={href} to={href} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-sm text-slate-700 font-medium">
                  <span className="text-amber-500">→</span> {label}
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
      <SharedFooter />
    </div>
  );
}