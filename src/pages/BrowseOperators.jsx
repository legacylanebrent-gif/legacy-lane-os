import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import ClaimCompanyModal from '@/components/operators/ClaimCompanyModal';
import { ReferByEmailModal, logReferral } from '@/components/operators/ReferOperatorModal';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Building2, Phone, Globe, ChevronDown, ChevronRight, Mail, MessageSquare } from 'lucide-react';
import { US_STATES } from '@/components/data/USStates';

// Strip HTML tags from a string
function stripHtml(str) {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// State center coords for map markers (approximate)
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

export default function BrowseOperators() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState(null);
  const [expandedStates, setExpandedStates] = useState({});
  const [claimingOperator, setClaimingOperator] = useState(null);
  const [emailReferOperator, setEmailReferOperator] = useState(null);
  const [textSentId, setTextSentId] = useState(null); // tracks which op had text referral sent

  const handleReferByText = async (op) => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    const referralCode = currentUser.id.slice(-8).toUpperCase();
    const referralLink = `${window.location.origin}/OperatorPackages?ref=${referralCode}`;
    const smsBody = `Hi ${op.company_name}! I think you'd love EstateSalen.com — it helps estate sale companies grow with digital listings, marketing tools & a national buyer network. Sign up here: ${referralLink}`;

    // Log the referral + award points
    await logReferral({ currentUser, operator: op, contactEmail: op.email || '' });
    setTextSentId(op.id);
    setTimeout(() => setTextSentId(null), 3000);

    // Open SMS app with pre-filled message (phone if available, otherwise blank)
    const phone = op.phone ? op.phone.replace(/\D/g, '') : '';
    window.open(`sms:${phone}?body=${encodeURIComponent(smsBody)}`, '_blank');
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      // Load in batches to get all operators
      const batch1 = await base44.entities.FutureEstateOperator.list('-created_date', 500);
      const batch2 = await base44.entities.FutureEstateOperator.list('-created_date', 500, 500);
      const all = [...(batch1 || []), ...(batch2 || [])];
      setOperators(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group operators by state → city
  const grouped = useMemo(() => {
    const filtered = operators.filter(op => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        op.company_name?.toLowerCase().includes(q) ||
        op.city?.toLowerCase().includes(q) ||
        op.state?.toLowerCase().includes(q)
      );
    });

    const result = {};
    filtered.forEach(op => {
      const state = stripHtml(op.state) || 'Unknown';
      const city = stripHtml(op.city) || 'Unknown';
      if (!result[state]) result[state] = {};
      if (!result[state][city]) result[state][city] = [];
      result[state][city].push(op);
    });
    return result;
  }, [operators, searchQuery]);

  const sortedStates = Object.keys(grouped).sort();

  // Map markers: one per state showing count
  const stateMarkers = useMemo(() => {
    return sortedStates.map(stateCode => {
      const center = STATE_CENTERS[stateCode];
      if (!center) return null;
      const count = Object.values(grouped[stateCode] || {}).reduce((s, arr) => s + arr.length, 0);
      return { stateCode, center, count };
    }).filter(Boolean);
  }, [grouped, sortedStates]);

  const toggleState = (stateCode) => {
    setExpandedStates(prev => ({ ...prev, [stateCode]: !prev[stateCode] }));
  };

  const totalCount = operators.length;
  const filteredCount = Object.values(grouped).reduce((s, cities) =>
    s + Object.values(cities).reduce((cs, ops) => cs + ops.length, 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      <ClaimCompanyModal
        operator={claimingOperator}
        open={!!claimingOperator}
        onClose={() => setClaimingOperator(null)}
      />
      <ReferByEmailModal
        operator={emailReferOperator}
        open={!!emailReferOperator}
        onClose={() => setEmailReferOperator(null)}
        currentUser={currentUser}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-orange-400" />
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">Browse Estate Sale Companies</h1>
          </div>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Discover {totalCount.toLocaleString()}+ estate sale companies across all 50 states
          </p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by company name, city, or state..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white/95 border-0 shadow-xl"
            />
          </div>
          {searchQuery && (
            <p className="text-slate-400 text-sm mt-3">Showing {filteredCount} of {totalCount} companies</p>
          )}
        </div>
      </section>

      {/* Interactive Map */}
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-4 text-center">🗺️ Companies by State</h2>
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
            <MapContainer
              center={[39.8, -98.6]}
              zoom={4}
              style={{ height: '450px', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {stateMarkers.map(({ stateCode, center, count }) => (
                <Marker key={stateCode} position={center}>
                  <Popup>
                    <div className="text-sm font-semibold">
                      <p className="text-base font-bold text-slate-900">
                        {US_STATES.find(s => s.code === stateCode)?.name || stateCode}
                      </p>
                      <p className="text-orange-600">{count} {count === 1 ? 'company' : 'companies'}</p>
                      <button
                        onClick={() => {
                          setSelectedState(stateCode);
                          document.getElementById(`state-${stateCode}`)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mt-2 text-cyan-600 hover:underline"
                      >
                        View companies →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </section>

      {/* State / City Breakdown */}
      <section className="py-10 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-lg animate-pulse">Loading companies...</div>
          ) : sortedStates.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No companies found.</div>
          ) : (
            <div className="space-y-4">
              {sortedStates.map(stateCode => {
                const cities = grouped[stateCode];
                const sortedCities = Object.keys(cities).sort();
                const stateTotal = sortedCities.reduce((s, c) => s + cities[c].length, 0);
                const stateName = US_STATES.find(s => s.code === stateCode)?.name || stateCode;
                const isExpanded = !!expandedStates[stateCode];

                return (
                  <div key={stateCode} id={`state-${stateCode}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* State Header */}
                    <button
                      onClick={() => toggleState(stateCode)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{stateCode}</span>
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900 text-lg">{stateName}</p>
                          <p className="text-sm text-slate-500">{sortedCities.length} cities · {stateTotal} companies</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">{stateTotal}</Badge>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>

                    {/* Cities & Companies */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-6 py-4 space-y-6">
                        {sortedCities.map(city => (
                          <div key={city}>
                            <div className="flex items-center gap-2 mb-3">
                              <MapPin className="w-4 h-4 text-orange-500" />
                              <h4 className="font-semibold text-slate-700">{stripHtml(city)}</h4>
                              <Badge variant="outline" className="text-xs">{cities[city].length}</Badge>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {cities[city].map(op => (
                                <Card key={op.id} className="hover:shadow-md transition-shadow border-slate-200">
                                  <CardContent className="p-4">
                                    <h5 className="font-semibold text-slate-900 text-sm mb-1 leading-tight">{stripHtml(op.company_name)}</h5>
                                    <p className="text-xs text-slate-500 mb-2">{stripHtml(op.city)}, {stripHtml(op.state)}</p>
                                    <div className="space-y-1">
                                      {op.phone && (
                                        <a href={`tel:${stripHtml(op.phone)}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-600 transition-colors">
                                          <Phone className="w-3 h-3" /> {stripHtml(op.phone)}
                                        </a>
                                      )}
                                      {op.website_url && (
                                        <a href={stripHtml(op.website_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-cyan-600 hover:underline">
                                          <Globe className="w-3 h-3" /> Website
                                        </a>
                                      )}
                                      {op.member_since && (
                                        <p className="text-xs text-slate-400">Member since {stripHtml(op.member_since)}</p>
                                      )}
                                    </div>
                                    {op.package_type ? (
                                      <Badge className="mt-2 text-xs bg-orange-100 text-orange-700 border-orange-200">{stripHtml(op.package_type)}</Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="mt-3 w-full text-xs bg-orange-500 hover:bg-orange-600 text-white h-7"
                                        onClick={() => setClaimingOperator(op)}
                                      >
                                        Claim My Company
                                      </Button>
                                    )}
                                    {isAuthenticated && (
                                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs border-green-300 text-green-700 hover:bg-green-50 h-7 gap-1"
                                          onClick={() => handleReferByText(op)}
                                        >
                                          {textSentId === op.id ? '✅ Sent!' : '💬 Refer by Text'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 h-7 gap-1"
                                          onClick={() => setEmailReferOperator(op)}
                                        >
                                          ✉️ Refer by Email
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
        <Link to={createPageUrl('OperatorPackages')}>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-11 text-base">
            Get Started
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="logo" className="h-14 w-14 object-contain" />
                <div>
                  <h3 className="text-2xl font-serif font-bold">EstateSalen.com</h3>
                  <p className="text-sm text-orange-400">Estate Sale Finder</p>
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Discover amazing estate sales and find treasures near you. Connect with trusted estate sale companies nationwide.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('SearchByState')} className="text-white hover:text-orange-400 transition-colors">Browse by State</Link></li>
                <li><Link to={createPageUrl('BrowseOperators')} className="text-white hover:text-orange-400 transition-colors">Browse Companies</Link></li>
                <li><Link to={createPageUrl('Home')} className="text-white hover:text-orange-400 transition-colors">Find Sales</Link></li>
                <li><Link to={createPageUrl('BrowseItems')} className="text-white hover:text-orange-400 transition-colors">Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-white hover:text-orange-400 transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('AgentSignup')} className="text-white hover:text-orange-400 transition-colors">Real Estate Agents</Link></li>
                <li><Link to={createPageUrl('VendorSignup')} className="text-white hover:text-orange-400 transition-colors">Vendors</Link></li>
                <li><Link to={createPageUrl('StartYourCompany')} className="text-white hover:text-orange-400 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">© {new Date().getFullYear()} EstateSalen.com. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}