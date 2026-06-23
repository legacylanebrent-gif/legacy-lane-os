import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import ClaimCompanyModal from '@/components/operators/ClaimCompanyModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Building2, Phone, Globe, Star, ArrowLeft, Loader2, Navigation } from 'lucide-react';
import { US_STATES } from '@/components/data/USStates';
import SharedFooter from '@/components/layout/SharedFooter';
import { formatPhone } from '@/utils/formatPhone';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATE_CENTERS = {
  AL: [32.8, -86.8], AK: [64.2, -153.4], AZ: [34.3, -111.1], AR: [34.8, -92.2], CA: [36.8, -119.4],
  CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5], DC: [38.9, -77.0], FL: [27.8, -81.6],
  GA: [32.9, -83.4], HI: [20.8, -156.3], ID: [44.1, -114.5], IL: [40.0, -89.2], IN: [39.8, -86.1],
  IA: [42.0, -93.2], KS: [38.5, -98.4], KY: [37.7, -84.8], LA: [31.2, -91.8], ME: [44.7, -69.4],
  MD: [39.0, -76.8], MA: [42.2, -71.5], MI: [44.3, -85.4], MN: [46.4, -93.1], MS: [32.7, -89.7],
  MO: [38.4, -92.3], MT: [46.9, -110.4], NE: [41.5, -99.9], NV: [38.5, -117.1], NH: [43.5, -71.6],
  NJ: [40.1, -74.5], NM: [34.4, -106.1], NY: [42.2, -74.9], NC: [35.6, -79.4], ND: [47.5, -100.5],
  OH: [40.4, -82.8], OK: [35.6, -96.9], OR: [44.1, -120.5], PA: [40.9, -77.8], RI: [41.7, -71.5],
  SC: [33.8, -80.9], SD: [44.4, -100.2], TN: [35.9, -86.3], TX: [31.1, -97.6], UT: [39.3, -111.1],
  VT: [44.0, -72.7], VA: [37.8, -79.5], WA: [47.4, -120.5], WV: [38.5, -80.6], WI: [44.3, -89.6],
  WY: [43.1, -107.6],
};

function stripHtml(str) {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function isJunkEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.endsWith('@estatesales.net') || lower.endsWith('@estatesales.org');
}
function cleanEmailFn(record) {
  return isJunkEmail(record.email) ? { ...record, email: '' } : record;
}

function isPaidSubscriber(op) {
  const pkg = (op.package_type || op.membership_tier || '').toLowerCase();
  return pkg.includes('elite') || pkg.includes('professional') || pkg.includes('growth') || pkg.includes('pro') || pkg.includes('platinum') || pkg.includes('premium');
}

function isElite(op) {
  const pkg = (op.package_type || op.membership_tier || '').toLowerCase();
  return pkg.includes('elite');
}

function tierRank(op) {
  const pkg = (op.package_type || op.membership_tier || '').toLowerCase();
  if (pkg.includes('elite')) return 4;
  if (pkg.includes('professional') || pkg.includes('pro') || pkg.includes('platinum')) return 3;
  if (pkg.includes('growth') || pkg.includes('premium')) return 2;
  if (pkg.includes('starter') || pkg.includes('basic')) return 1;
  return 0;
}

export default function EstateSaleCompanyDirectory() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateCounts, setStateCounts] = useState({});

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
    loadAllCompanies();
  }, []);

  const loadAllCompanies = async () => {
    setLoading(true);
    try {
      const BATCH_SIZE = 500;
      const MAX_RECORDS = 12000;
      const offsets = [];
      for (let offset = 0; offset < MAX_RECORDS; offset += BATCH_SIZE) offsets.push(offset);

      const [netBatches, orgBatches, cleanBatches] = await Promise.all([
        Promise.all(offsets.map(o => base44.entities.FutureEstateOperator.list('-created_date', BATCH_SIZE, o).catch(() => []))),
        Promise.all(offsets.slice(0, 4).map(o => base44.entities.EstatesalesOrgOperator.list('-created_date', BATCH_SIZE, o).catch(() => []))),
        Promise.all(offsets.slice(0, 4).map(o => base44.entities.FutureOperatorLead.list('-created_date', BATCH_SIZE, o).catch(() => []))),
      ]);

      const netData = netBatches.flat().filter(Boolean);
      const orgData = orgBatches.flat().filter(Boolean).map(r => ({ ...r, state: r.base_state, city: r.base_city }));
      const cleanData = cleanBatches.flat().filter(Boolean);

      let combined;
      if (cleanData.length > 0) {
        const cleanSourceIds = new Set(cleanData.map(r => r.source_id).filter(Boolean));
        combined = [...cleanData, ...netData.filter(r => !cleanSourceIds.has(r.id)), ...orgData.filter(r => !cleanSourceIds.has(r.id))];
      } else {
        combined = [...netData, ...orgData];
      }

      const seen = new Set();
      const deduped = combined.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      const all = deduped.map(cleanEmailFn);

      const counts = {};
      all.forEach(op => {
        const state = stripHtml(op.state);
        if (state && state.length === 2) counts[state] = (counts[state] || 0) + 1;
      });
      setStateCounts(counts);
      setOperators(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectState = (stateCode) => {
    setSelectedState(stateCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToStates = () => {
    setSelectedState(null);
    setSearchQuery('');
  };

  const displayedOperators = useMemo(() => {
    if (!selectedState) return [];
    let list = operators.filter(op => stripHtml(op.state) === selectedState);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(op =>
        stripHtml(op.company_name)?.toLowerCase().includes(q) ||
        stripHtml(op.city)?.toLowerCase().includes(q) ||
        stripHtml(op.county)?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      const tierDiff = tierRank(b) - tierRank(a);
      if (tierDiff !== 0) return tierDiff;
      return stripHtml(a.company_name || '').localeCompare(stripHtml(b.company_name || ''));
    });

    return list;
  }, [operators, selectedState, searchQuery]);

  const eliteOperators = useMemo(() => displayedOperators.filter(isElite), [displayedOperators]);
  const otherPaidOperators = useMemo(() => displayedOperators.filter(op => isPaidSubscriber(op) && !isElite(op)), [displayedOperators]);
  const unpaidOperators = useMemo(() => displayedOperators.filter(op => !isPaidSubscriber(op)), [displayedOperators]);
  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return US_STATES.filter(s => stateCounts[s.code]);
    return US_STATES.filter(s =>
      stateCounts[s.code] && (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
    );
  }, [stateCounts, searchQuery]);
  const stateName = useMemo(() => US_STATES.find(s => s.code === selectedState)?.name || selectedState, [selectedState]);
  const stateCenter = useMemo(() => STATE_CENTERS[selectedState] || [39.8, -98.6], [selectedState]);
  const mapZoom = useMemo(() => selectedState === 'AK' || selectedState === 'CA' || selectedState === 'TX' ? 5 : 7, [selectedState]);
  const mapMarkers = useMemo(() => displayedOperators.filter(op => op.lat && op.lng).slice(0, 200), [displayedOperators]);
  const totalCount = Object.values(stateCounts).reduce((s, c) => s + c, 0);

  const [claimingOperator, setClaimingOperator] = useState(null);

  const OperatorCard = ({ op, featured = false }) => (
    <Card className={`hover:shadow-lg transition-shadow ${featured ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-slate-200'}`}>
      <CardContent className="p-4">
        {featured && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Featured Company</span>
          </div>
        )}
        <h5 className="font-semibold text-slate-900 text-sm mb-1 leading-tight">{stripHtml(op.company_name)}</h5>
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {stripHtml(op.geocoded_city || op.city)}, {stripHtml(op.state)}
          {op.geocoded_zip || op.zip_code ? ` ${op.geocoded_zip || op.zip_code}` : ''}
        </p>
        {op.county && (
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {stripHtml(op.geocoded_county || op.county)} County
          </p>
        )}
        <div className="space-y-1">
          {op.phone && (
            <a href={`tel:${stripHtml(op.phone)}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-600 transition-colors">
              <Phone className="w-3 h-3" /> {formatPhone(stripHtml(op.phone))}
            </a>
          )}
          {(op.website_url || op.website) && (
            <a href={stripHtml(op.website_url || op.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-cyan-600 hover:underline">
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
          {op.member_since && <p className="text-xs text-slate-400">Member since {stripHtml(op.member_since)}</p>}
        </div>
        {op.package_type || op.membership_tier ? (
          <Badge className={`mt-2 text-xs ${featured ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
            {stripHtml(op.package_type || op.membership_tier)}
          </Badge>
        ) : (
          <Button size="sm" className="mt-3 w-full text-xs bg-orange-500 hover:bg-orange-600 text-white h-7" onClick={() => setClaimingOperator(op)}>
            Claim My Business
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (selectedState) {

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
        <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />
        <ClaimCompanyModal operator={claimingOperator} open={!!claimingOperator} onClose={() => setClaimingOperator(null)} />

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <button onClick={handleBackToStates} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to All States
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{selectedState}</span>
              </div>
              <div>
                <h1 className="text-4xl font-serif font-bold text-white">{stateName} Estate Sale Companies</h1>
                <p className="text-slate-400 text-sm">
                  {loading ? 'Loading...' : `${displayedOperators.length.toLocaleString()} companies in directory`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-600" />
          </div>
        ) : (
          <>
            {/* State Map */}
            {mapMarkers.length > 0 && (
              <section className="py-8 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                  <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">🗺️ {stateName} Company Map</h2>
                  <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                    <MapContainer center={stateCenter} zoom={mapZoom} style={{ height: '380px', width: '100%' }} className="z-0">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      />
                      {mapMarkers.map(op => (
                        <Marker key={op.id} position={[op.lat, op.lng]}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold text-slate-900">{stripHtml(op.company_name)}</p>
                              <p className="text-slate-500">{stripHtml(op.geocoded_city || op.city)}, {stripHtml(op.county || '')}</p>
                              {op.phone && <p className="text-cyan-700">{formatPhone(op.phone)}</p>}
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>
              </section>
            )}

            {/* Search Filter */}
            <section className="py-6 px-4 bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by company name, city, or county..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 bg-white border shadow"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">{displayedOperators.length} companies found</p>
              </div>
            </section>

            {/* Featured / Elite Section */}
            {eliteOperators.length > 0 && (
              <section className="py-10 px-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-y border-yellow-200">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-400" />
                    <h2 className="text-2xl font-serif font-bold text-slate-900">Featured Companies</h2>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Elite Level</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {eliteOperators.map(op => <OperatorCard key={op.id} op={op} featured />)}
                  </div>
                </div>
              </section>
            )}

            {/* Other Paid Subscribers */}
            {otherPaidOperators.length > 0 && (
              <section className="py-10 px-4 bg-gradient-to-br from-cyan-50 to-blue-50 border-y border-cyan-200">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="w-5 h-5 text-cyan-500 fill-cyan-400" />
                    <h2 className="text-xl font-serif font-bold text-slate-900">Premium Companies</h2>
                    <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">Professional/Growth</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {otherPaidOperators.map(op => <OperatorCard key={op.id} op={op} featured={false} />)}
                  </div>
                </div>
              </section>
            )}

            {/* All Other Companies */}
            <section className="py-10 px-4">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-bold text-slate-900">
                    All Companies in {stateName}
                  </h2>
                  <Badge variant="outline" className="text-sm">{displayedOperators.length} total</Badge>
                </div>

                {displayedOperators.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No companies found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unpaidOperators.map(op => <OperatorCard key={op.id} op={op} />)}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Footer CTA */}
        <section className="py-12 px-4 bg-slate-800 text-center">
          <h3 className="text-2xl font-serif font-bold text-white mb-3">Is this your company?</h3>
          <p className="text-slate-400 mb-6">Claim your business listing and unlock powerful marketing tools</p>
          <Link to="/OperatorPackages">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-11 text-base">Get Started</Button>
          </Link>
        </section>

        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">Estate Sale Company Directory</h1>
          </div>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            {loading ? 'Loading...' : `Browse ${totalCount.toLocaleString()}+ estate sale companies across all 50 states`}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by state name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white/95 border-0 shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* State Grid */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2 text-center">📍 Select a State</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">Click any state to view all estate sale companies in that area</p>

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-lg animate-pulse">Loading companies...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredStates.sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                const count = stateCounts[s.code] || 0;
                return (
                  <button
                    key={s.code}
                    onClick={() => handleSelectState(s.code)}
                    className="text-left rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-slate-800 group-hover:text-cyan-700">{s.code}</span>
                      <span className="text-xs text-slate-400 group-hover:text-cyan-500">→</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-tight mb-2">{s.name}</p>
                    <span className="text-xl font-bold text-orange-600">{count.toLocaleString()}</span>
                    <p className="text-xs text-slate-400">companies</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 px-4 bg-slate-800 text-center">
        <h3 className="text-2xl font-serif font-bold text-white mb-3">Want to list your company?</h3>
        <p className="text-slate-400 mb-6">Join thousands of estate sale professionals on EstateSalen.com</p>
        <Link to="/OperatorPackages">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-11 text-base">Get Started</Button>
        </Link>
      </section>

      <SharedFooter />
    </div>
  );
}