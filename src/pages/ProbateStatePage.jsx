import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import ProbateLeadForm from '@/components/probate/ProbateLeadForm';
import ProbateDisclaimer from '@/components/probate/ProbateDisclaimer';
import ProbateStepProcess from '@/components/probate/ProbateStepProcess';
import { ExternalLink, ChevronRight, MapPin, Scale, Home, FileText, AlertTriangle } from 'lucide-react';

export default function ProbateStatePage() {
  const { stateSlug } = useParams();

  const [stateData, setStateData] = useState(null);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stateSlug) return;
    Promise.all([
      base44.entities.ProbateState.filter({ slug: stateSlug }),
      base44.entities.ProbateCounty.filter({ state_slug: stateSlug, status: 'published' })
    ]).then(([states, counties]) => {
      setStateData(states[0] || null);
      setCounties(counties);
      setLoading(false);
      if (states[0]?.seo_title) document.title = states[0].seo_title;
    });
  }, [stateSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading guide...</div>
      </div>
    );
  }

  const stateName = stateData?.state_name || stateSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />

      {/* Breadcrumb */}
      <div className="bg-slate-100 px-4 py-2 text-sm text-slate-600">
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          <Link to="/probate" className="hover:text-amber-600">Probate Hub</Link>
          <ChevronRight className="w-3 h-3" />
          <span>{stateName}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-3 bg-amber-500/20 text-amber-300 border-amber-500/30">{stateName} Probate Guide</Badge>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">
            How to Start Probate in {stateName}
          </h1>
          <p className="text-slate-300 max-w-2xl">
            {stateData?.intro_content || `A general educational guide to the probate process in ${stateName}, including when an estate sale may be needed and how to prepare an inherited home for sale.`}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

        {/* Disclaimer */}
        <ProbateDisclaimer />

        {/* Quick Facts */}
        {stateData?.quick_facts && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5" /> {stateName} Probate Quick Facts
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(stateData.quick_facts).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="font-semibold text-blue-800">{k}:</span>{' '}
                    <span className="text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Court Info */}
        {(stateData?.probate_court_name || stateData?.official_court_url) && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-600" /> {stateName} Probate Court
              </h2>
              {stateData.probate_court_name && (
                <p className="text-slate-700 mb-2"><strong>Court System:</strong> {stateData.probate_court_name}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                {stateData.official_court_url && (
                  <a href={stateData.official_court_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" /> Official Court Website
                    </Button>
                  </a>
                )}
                {stateData.official_forms_url && (
                  <a href={stateData.official_forms_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="w-4 h-4" /> Probate Forms
                    </Button>
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-3">Always confirm current forms and filing fees with the court directly. Requirements change.</p>
            </CardContent>
          </Card>
        )}

        {/* Step by Step */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Step-by-Step Probate Process in {stateName}</h2>
          {stateData?.step_by_step_process ? (
            <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: stateData.step_by_step_process }} />
          ) : (
            <ProbateStepProcess />
          )}
        </div>

        {/* Estate Sale Section */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-amber-900 mb-3 flex items-center gap-2">
              <Home className="w-5 h-5" /> Estate Sales During {stateName} Probate
            </h2>
            {stateData?.estate_sale_section ? (
              <div className="text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: stateData.estate_sale_section }} />
            ) : (
              <p className="text-slate-700 text-sm leading-relaxed">
                During or after probate in {stateName}, many families choose to liquidate the personal property of an estate through an estate sale. A licensed estate sale company can appraise items, organize the sale, and handle pricing — helping the estate settle faster. EstateSalen can connect you with estate sale companies in {stateName} that have experience with probate estates.
              </p>
            )}
            <Link to="/probate#get-help">
              <Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white">Find an Estate Sale Company in {stateName}</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Inherited Home */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Selling an Inherited Home in {stateName}</h2>
          {stateData?.inherited_home_section ? (
            <div className="prose max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: stateData.inherited_home_section }} />
          ) : (
            <div className="space-y-3 text-slate-700 leading-relaxed">
              <p>After completing probate in {stateName}, heirs may need to sell an inherited property. There are several paths available:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /><span><strong>List with a Realtor:</strong> A probate-friendly real estate agent can list the property on the MLS and market it to buyers. This often yields the highest price but takes longer.</span></li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /><span><strong>Cash Offer / Investor:</strong> An investor or iBuyer can close quickly — sometimes in as few as 7–14 days. The offer may be below market value, but speed and simplicity are the trade-off.</span></li>
                <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /><span><strong>Auction:</strong> Probate properties are sometimes sold at auction. Confirm with your local probate court or licensed attorney if court approval is required to sell estate property.</span></li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">Tax implications of inherited property sales vary. Confirm with a tax professional.</p>
            </div>
          )}
        </div>

        {/* County Selector */}
        {counties.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">County Probate Guides in {stateName}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {counties.map(c => (
                <Link key={c.id} to={`/probate/${stateSlug}/${c.slug}`}>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center hover:bg-amber-100 transition-colors text-sm font-medium text-slate-700">
                    {c.county_name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {stateData?.faq_json?.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions — {stateName} Probate</h2>
            <div className="space-y-4">
              {stateData.faq_json.map((faq, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="font-semibold text-slate-900 mb-2">{faq.question}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead CTA */}
        <div id="get-help">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Get Free Help in {stateName}</h2>
          <p className="text-slate-600 mb-6">Tell us about your situation and we'll connect you with estate sale companies, realtors, cleanout vendors, and other trusted professionals in {stateName}.</p>
          <div className="mb-4"><ProbateDisclaimer /></div>
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <ProbateLeadForm sourceState={stateName} sourcePage={`/probate/${stateSlug}`} />
            </CardContent>
          </Card>
        </div>
      </div>

      <SharedFooter />
    </div>
  );
}