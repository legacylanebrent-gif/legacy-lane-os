import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { formatPhone } from '@/utils/formatPhone';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import SEDisclaimer from '@/components/seo-engine/SEDisclaimer';
import SELeadCTA from '@/components/seo-engine/SELeadCTA';
import SEStateSelector from '@/components/seo-engine/SEStateSelector';
import { Star, Phone, Globe, MapPin } from 'lucide-react';

const TYPE_CONFIG = {
  'estate-sale-companies': {
    label: 'Estate Sale Companies', providerType: 'estate_sale_operator',
    title: (s) => `Estate Sale Companies in ${s}`,
    desc: (s) => `Find licensed estate sale companies in ${s}. Connect with operators who specialize in estate liquidation, probate sales, and downsizing.`,
    lifeEventType: 'estate_settlement',
  },
  'probate-realtors': {
    label: 'Probate Realtors', providerType: 'realtor',
    title: (s) => `Probate-Friendly Realtors in ${s}`,
    desc: (s) => `Find real estate agents in ${s} experienced with probate sales, inherited homes, and estate properties.`,
    lifeEventType: 'probate',
  },
};

export default function ProviderDirectoryPage({ directoryType: directoryTypeProp }) {
  const params = useParams();
  const directoryType = directoryTypeProp || params.directoryType;
  const { stateSlug, countySlug } = params;
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const config = TYPE_CONFIG[directoryType] || TYPE_CONFIG['estate-sale-companies'];
  const stateName = stateSlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const countyName = countySlug?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  const locationLabel = countyName ? `${countyName}, ${stateName}` : stateName || 'Your Area';

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!stateSlug) { setLoading(false); return; }
    const filter = { provider_type: config.providerType, status: 'active', state: stateName };
    base44.entities.ProviderDirectory.filter(filter)
      .then(results => { setProviders(results); setLoading(false); });
  }, [stateSlug, countySlug, config.providerType]);

  const crumbs = [
    { label: config.label, href: `/${directoryType}` },
    ...(stateSlug ? [{ label: stateName, href: countySlug ? `/${directoryType}/${stateSlug}` : undefined }] : []),
    ...(countySlug ? [{ label: countyName }] : []),
  ];

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={crumbs} />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">
            {stateSlug ? config.title(locationLabel) : config.label}
          </h1>
          <p className="text-slate-300 max-w-2xl">
            {stateSlug ? config.desc(locationLabel) : `Find trusted ${config.label.toLowerCase()} across all 50 states.`}
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <SEDisclaimer />

        {/* Provider listings */}
        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading providers...</div>
        ) : providers.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">{providers.length} {config.label} in {locationLabel}</h2>
            <div className="space-y-4">
              {providers.map(p => (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900">{p.business_name}</h3>
                          <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
                        </div>
                        {p.description && <p className="text-sm text-slate-600 mb-2">{p.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {p.state && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.state}</span>}
                          {(p.business_phone || p.phone) && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhone(p.business_phone || p.phone)}</span>}
                          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><Globe className="w-3 h-3" />Website</a>}
                        </div>
                        {p.specialties_json?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {p.specialties_json.map(s => <Badge key={s} className="text-xs bg-slate-100 text-slate-600">{s}</Badge>)}
                          </div>
                        )}
                      </div>
                      {p.rating && (
                        <div className="text-center flex-shrink-0">
                          <div className="flex items-center gap-1 text-amber-500"><Star className="w-4 h-4 fill-current" /><span className="font-bold text-slate-800">{p.rating}</span></div>
                          <p className="text-xs text-slate-500">{p.review_count} reviews</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : stateSlug ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-600 mb-2 font-semibold">No listed providers found in {locationLabel} yet.</p>
            <p className="text-sm text-slate-500">Submit the form below and we'll connect you with qualified professionals.</p>
          </div>
        ) : (
          <SEStateSelector baseSlug={directoryType} title={`Find ${config.label} by State`} desc={`Select your state to view ${config.label.toLowerCase()} near you.`} />
        )}

        {stateSlug && (
          <SELeadCTA
            lifeEventType={config.lifeEventType}
            defaultState={stateName}
            sourceUrl={`/${directoryType}/${stateSlug}`}
            sourcePageType="provider_directory"
            ctaTitle={`Connect with ${config.label} in ${locationLabel}`}
            ctaDesc="Tell us about your situation and we'll match you with the right professionals."
          />
        )}
      </div>
      <SharedFooter />
    </div>
  );
}