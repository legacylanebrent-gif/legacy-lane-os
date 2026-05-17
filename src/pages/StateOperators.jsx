import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Search, MapPin, Building2, Phone, Globe, Star, ArrowLeft, Loader2 } from 'lucide-react';
import { US_STATES } from '@/components/data/USStates';
import SharedFooter from '@/components/layout/SharedFooter';

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

// ZIP code prefix → approximate [lat, lng] for common US ZIP prefixes
// Used as a rough proximity sort (not geocoding)
const ZIP_PREFIX_COORDS = {
  '0': [43.0, -71.5], '1': [42.5, -74.0], '2': [38.9, -77.0], '3': [33.5, -84.0],
  '4': [41.5, -82.0], '5': [44.0, -93.0], '6': [41.8, -72.7], '7': [35.5, -97.5],
  '8': [39.7, -104.9], '9': [37.8, -122.4],
};

function stripHtml(str) {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

// Rough distance between two lat/lng points (Haversine, in miles)
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Package tier rank (higher = better)
const TIER_RANK = { elite: 4, platinum: 3, premium: 3, pro: 2, basic: 1 };
function tierRank(op) {
  const pkg = (op.package_type || op.membership_tier || '').toLowerCase();
  for (const [key, rank] of Object.entries(TIER_RANK)) {
    if (pkg.includes(key)) return rank;
  }
  return op.package_type ? 1 : 0;
}

function isElite(op) {
  const pkg = (op.package_type || op.membership_tier || '').toLowerCase();
  return pkg.includes('elite');
}

// ZIP → approx coords using geocoded fields or prefix fallback
function opCoords(op) {
  if (op.lat && op.lng) return [op.lat, op.lng];
  return null;
}

function zipToApproxCoords(zip) {
  if (!zip || zip.length < 1) return null;
  return ZIP_PREFIX_COORDS[zip[0]] || null;
}

function isJunkEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  return lower.endsWith('@estatesales.net') || lower.endsWith('@estatesales.org');
}
function cleanEmailFn(record) {
  return isJunkEmail(record.email) ? { ...record, email: '' } : record;
}

export default function StateOperators() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const stateCode = (urlParams.get('state') || '').toUpperCase();
  const stateName = US_STATES.find(s => s.code === stateCode)?.name || stateCode;

  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [zipFilter, setZipFilter] = useState('');
  const [claimingOperator, setClaimingOperator] = useState(null);
  const [emailReferOperator, setEmailReferOperator] = useState(null);
  const [textSentId, setTextSentId] = useState(null);

  useEffect(() => {
    if (!stateCode) return;
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
    loadStateOperators();
  }, [stateCode]);

  const loadStateOperators = async () => {
    setLoading(true);
    try {
      const [cleanData, netData, orgData] = await Promise.all([
        base44.entities.FutureOperatorLead.filter({ state: stateCode }, '-created_date', 1000).catch(() => []),
        base44.entities.FutureEstateOperator.filter({ state: stateCode }, '-created_date', 1000).catch(() => []),
        base44.entities.EstatesalesOrgOperator.filter({ base_state: stateCode }, '-created_date', 1000).catch(() => []),
      ]);

      const orgNormalized = (orgData || []).map(r => ({ ...r, state: r.base_state, city: r.base_city }));

      let combined;
      if ((cleanData || []).length > 0) {
        const cleanSourceIds = new Set(cleanData.map(r => r.source_id).filter(Boolean));
        combined = [
          ...cleanData,
          ...(netData || []).filter(r => !cleanSourceIds.has(r.id)),
          ...orgNormalized.filter(r => !cleanSourceIds.has(r.id)),
        ];
      } else {
        combined = [...(netData || []), ...orgNormalized];
      }

      const seen = new Set();
      const deduped = combined.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setOperators(deduped.map(cleanEmailFn));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReferByText = async (op) => {
    if (!currentUser) { base44.auth.redirectToLogin(window.location.href); return; }
    const referralCode = currentUser.id.slice(-8).toUpperCase();
    const referralLink = `${window.location.origin}/OperatorPackages?ref=${referralCode}`;
    const smsBody = `Hi ${op.company_name}! I think you'd love EstateSalen.com — it helps estate sale companies grow with digital listings, marketing tools & a national buyer network. Sign up here: ${referralLink}`;
    await logReferral({ currentUser, operator: op, contactEmail: op.email || '' });
    setTextSentId(op.id);
    setTimeout(() => setTextSentId(null), 3000);
    const phone = op.phone ? op.phone.replace(/\D/g, '') : '';
    window.open(`sms:${phone}?body=${encodeURIComponent(smsBody)}`, '_blank');
  };

  // Filtered + sorted operators
  const displayedOperators = useMemo(() => {
    let list = operators;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(op =>
        op.company_name?.toLowerCase().includes(q) ||
        op.city?.toLowerCase().includes(q)
      );
    }

    // Sort by: ZIP proximity (if zip entered) + tier rank
    const zipCoords = zipFilter.length >= 3 ? zipToApproxCoords(zipFilter) : null;

    list = [...list].sort((a, b) => {
      const tierDiff = tierRank(b) - tierRank(a);

      if (zipCoords) {
        const coordsA = opCoords(a);
        const coordsB = opCoords(b);
        const distA = coordsA ? haversine(zipCoords, coordsA) : 9999;
        const distB = coordsB ? haversine(zipCoords, coordsB) : 9999;

        // Primary: tier (elite first), secondary: distance
        if (Math.abs(tierDiff) > 1) return tierDiff;
        return distA - distB;
      }

      return tierDiff;
    });

    return list;
  }, [operators, searchQuery, zipFilter]);

  const eliteOperators = useMemo(() => displayedOperators.filter(isElite), [displayedOperators]);
  const regularOperators = useMemo(() => displayedOperators.filter(op => !isElite(op)), [displayedOperators]);

  // Map markers: operators with geocoded coords
  const mapMarkers = useMemo(() =>
    operators.filter(op => op.lat && op.lng).slice(0, 200),
  [operators]);

  const stateCenter = STATE_CENTERS[stateCode] || [39.8, -98.6];
  const mapZoom = stateCode === 'AK' || stateCode === 'CA' || stateCode === 'TX' ? 5 : 7;

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
        <div className="space-y-1">
          {op.phone && (
            <a href={`tel:${stripHtml(op.phone)}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-600 transition-colors">
              <Phone className="w-3 h-3" /> {stripHtml(op.phone)}
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
            Claim My Company
          </Button>
        )}
        {isAuthenticated && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button size="sm" variant="outline" className="text-xs border-green-300 text-green-700 hover:bg-green-50 h-7" onClick={() => handleReferByText(op)}>
              {textSentId === op.id ? '✅ Sent!' : '💬 Text'}
            </Button>
            <Button size="sm" variant="outline" className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 h-7" onClick={() => setEmailReferOperator(op)}>
              ✉️ Email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!stateCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">No state selected. <Link to="/BrowseOperators" className="text-cyan-600 underline">Go back</Link></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      <ClaimCompanyModal operator={claimingOperator} open={!!claimingOperator} onClose={() => setClaimingOperator(null)} />
      <ReferByEmailModal operator={emailReferOperator} open={!!emailReferOperator} onClose={() => setEmailReferOperator(null)} currentUser={currentUser} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <button onClick={() => navigate('/BrowseOperators')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> All States
          </button>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{stateCode}</span>
                </div>
                <div>
                  <h1 className="text-4xl font-serif font-bold text-white">{stateName}</h1>
                  <p className="text-slate-400 text-sm">
                    {loading ? 'Loading...' : `${operators.length.toLocaleString()} estate sale companies`}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search company or city..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 bg-white/95 border-0 shadow-lg"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Your ZIP code"
                  value={zipFilter}
                  onChange={e => setZipFilter(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  className="pl-9 h-11 w-40 bg-white/95 border-0 shadow-lg"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
          {zipFilter.length >= 3 && (
            <p className="text-cyan-300 text-xs mt-3 ml-1">📍 Sorting by proximity to ZIP {zipFilter} + membership tier</p>
          )}
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
                            <p className="text-slate-500">{stripHtml(op.geocoded_city || op.city)}</p>
                            {op.phone && <p className="text-cyan-700">{op.phone}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </section>
          )}

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

          {/* All Companies */}
          <section className="py-10 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold text-slate-900">
                  All Companies in {stateName}
                </h2>
                <Badge variant="outline" className="text-sm">{displayedOperators.length} shown</Badge>
              </div>

              {regularOperators.length === 0 && eliteOperators.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No companies found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {regularOperators.map(op => <OperatorCard key={op.id} op={op} />)}
                </div>
              )}
            </div>
          </section>
        </>
      )}

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