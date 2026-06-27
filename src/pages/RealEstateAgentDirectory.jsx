import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UniversalHeader from '@/components/layout/UniversalHeader';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Phone, Globe, Star, ArrowLeft, Loader2, Navigation, User, Briefcase } from 'lucide-react';
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

// An agent is a verified EstateSalen subscriber only if they have an active
// subscription or have claimed their listing.
function isEstateSalenSubscriber(agent) {
  return agent.subscription_status === 'active' || agent.subscription_status === 'free_trial' || !!agent.claimed_by_user_id;
}

function isPaidSubscriber(agent) {
  return isEstateSalenSubscriber(agent);
}

function isElite(agent) {
  return isEstateSalenSubscriber(agent);
}

function tierRank(agent) {
  if (isEstateSalenSubscriber(agent)) return 4;
  return 0;
}

export default function RealEstateAgentDirectory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateCounts, setStateCounts] = useState({});

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
    loadAllAgents();
  }, []);

  const loadAllAgents = async () => {
    setLoading(true);
    try {
      const BATCH_SIZE = 500;
      const MAX_BATCHES = 30;
      const batches = await Promise.all(
        Array.from({ length: MAX_BATCHES }, (_, i) =>
          base44.entities.RealEstateAgentDirectory.list('-created_date', BATCH_SIZE, i * BATCH_SIZE).catch(() => [])
        )
      );
      const all = batches.flat().filter(Boolean);

      const counts = {};
      all.forEach(a => {
        const state = stripHtml(a.state);
        if (state && state.length === 2) counts[state] = (counts[state] || 0) + 1;
      });
      setStateCounts(counts);
      setAgents(all);
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

  const displayedAgents = useMemo(() => {
    if (!selectedState) return [];
    let list = agents.filter(a => stripHtml(a.state) === selectedState);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        stripHtml(a.agent_name)?.toLowerCase().includes(q) ||
        stripHtml(a.company_name)?.toLowerCase().includes(q) ||
        stripHtml(a.city)?.toLowerCase().includes(q) ||
        stripHtml(a.county)?.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      const tierDiff = tierRank(b) - tierRank(a);
      if (tierDiff !== 0) return tierDiff;
      return stripHtml(a.agent_name || '').localeCompare(stripHtml(b.agent_name || ''));
    });

    return list;
  }, [agents, selectedState, searchQuery]);

  const eliteAgents = useMemo(() => displayedAgents.filter(isElite), [displayedAgents]);
  const unpaidAgents = useMemo(() => displayedAgents.filter(a => !isPaidSubscriber(a)), [displayedAgents]);
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
  const mapMarkers = useMemo(() => {
    const base = displayedAgents.filter(a => a.lat && a.lng).slice(0, 200);
    const coordCount = {};
    base.forEach(a => {
      const key = `${a.lat.toFixed(4)}|${a.lng.toFixed(4)}`;
      coordCount[key] = (coordCount[key] || 0) + 1;
    });
    const coordIndex = {};
    return base.map(a => {
      const key = `${a.lat.toFixed(4)}|${a.lng.toFixed(4)}`;
      const total = coordCount[key];
      if (total <= 1) return a;
      const idx = coordIndex[key] = (coordIndex[key] || 0) + 1;
      const angle = (idx / total) * 2 * Math.PI;
      const radius = 0.01;
      return { ...a, lat: a.lat + Math.sin(angle) * radius, lng: a.lng + Math.cos(angle) * radius };
    });
  }, [displayedAgents]);
  const totalCount = Object.values(stateCounts).reduce((s, c) => s + c, 0);

  const AgentCard = ({ agent, featured = false }) => (
    <Card className={`hover:shadow-lg transition-shadow ${featured ? 'border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-slate-200'}`}>
      <CardContent className="p-4">
        {featured && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">Featured Agent</span>
          </div>
        )}
        <h5 className="font-semibold text-slate-900 text-sm mb-1 leading-tight">{stripHtml(agent.agent_name)}</h5>
        {agent.company_name && (
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            {stripHtml(agent.company_name)}
          </p>
        )}
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {stripHtml(agent.geocoded_city || agent.city)}, {stripHtml(agent.state)}
          {agent.geocoded_zip || agent.zip_code ? ` ${agent.geocoded_zip || agent.zip_code}` : ''}
        </p>
        {agent.county && (
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
            <Navigation className="w-3 h-3" />
            {stripHtml(agent.geocoded_county || agent.county)} County
          </p>
        )}
        {agent.specialties && agent.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {agent.specialties.slice(0, 3).map(s => (
              <Badge key={s} variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 bg-emerald-50">
                {s}
              </Badge>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {agent.phone && (
            <a href={`tel:${stripHtml(agent.phone)}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-cyan-600 transition-colors">
              <Phone className="w-3 h-3" /> {formatPhone(stripHtml(agent.phone))}
            </a>
          )}
          {agent.website && (
            <a href={stripHtml(agent.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-cyan-600 hover:underline">
              <Globe className="w-3 h-3" /> Website
            </a>
          )}
        </div>
        {isEstateSalenSubscriber(agent) ? (
          <Badge className={`mt-2 text-xs ${featured ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'}`}>
            ✓ EstateSalen Member
          </Badge>
        ) : currentUser?.primary_account_type === 'real_estate_agent' ? (
          <Link to="/AgentSignup">
            <Button size="sm" className="mt-3 w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7">
              Claim My Profile
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );

  if (selectedState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50">
        <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <button onClick={handleBackToStates} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to All States
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">{selectedState}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-serif font-bold text-white">{stateName} Real Estate Agents</h1>
                <p className="text-slate-400 text-sm">
                  {loading ? 'Loading...' : `${displayedAgents.length.toLocaleString()} agents in directory`}
                </p>
              </div>
              <Link to="/AgentSignup">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-11 text-base whitespace-nowrap">
                  + Add My Profile
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
          </div>
        ) : (
          <>
            {/* State Map */}
            {mapMarkers.length > 0 && (
              <section className="py-8 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                  <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">🗺️ {stateName} Agent Map</h2>
                  <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                    <MapContainer center={stateCenter} zoom={mapZoom} style={{ height: '380px', width: '100%' }} className="z-0">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      />
                      {mapMarkers.map(a => (
                        <Marker key={a.id} position={[a.lat, a.lng]}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold text-slate-900">{stripHtml(a.agent_name)}</p>
                              {a.company_name && <p className="text-slate-500">{stripHtml(a.company_name)}</p>}
                              <p className="text-slate-500">{stripHtml(a.geocoded_city || a.city)}, {stripHtml(a.state)} {stripHtml(a.geocoded_county || a.county || '')}</p>
                              {a.phone && <p className="text-cyan-700">{formatPhone(a.phone)}</p>}
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
                    placeholder="Search by county, city, or agent name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 bg-white border shadow"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">{displayedAgents.length} agents found</p>
              </div>
            </section>

            {/* Verified EstateSalen Members */}
            {eliteAgents.length > 0 && (
              <section className="py-10 px-4 bg-gradient-to-br from-yellow-50 to-emerald-50 border-y border-yellow-200">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="w-6 h-6 text-yellow-500 fill-yellow-400" />
                    <h2 className="text-2xl font-serif font-bold text-slate-900">Verified EstateSalen Members</h2>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Active Subscribers</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {eliteAgents.map(a => <AgentCard key={a.id} agent={a} featured />)}
                  </div>
                </div>
              </section>
            )}

            {/* All Other Agents */}
            <section className="py-10 px-4">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-bold text-slate-900">
                    All Agents in {stateName}
                  </h2>
                  <Badge variant="outline" className="text-sm">{unpaidAgents.length} unclaimed</Badge>
                </div>

                {unpaidAgents.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No agents found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unpaidAgents.map(a => <AgentCard key={a.id} agent={a} />)}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* Footer CTA */}
        <section className="py-12 px-4 bg-slate-800 text-center">
          <h3 className="text-2xl font-serif font-bold text-white mb-3">Are you a real estate agent?</h3>
          <p className="text-slate-400 mb-6">Claim your profile and start receiving motivated seller leads</p>
          <Link to="/AgentSignup">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11 text-base">Get Started</Button>
          </Link>
        </section>

        <SharedFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-14 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <User className="w-10 h-10 text-emerald-400" />
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white">Real Estate Agent Directory</h1>
          </div>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            {loading ? 'Loading...' : `Browse ${totalCount.toLocaleString()}+ real estate agents across all 50 states`}
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
          <p className="text-slate-500 text-center mb-8 text-sm">Click any state to view all real estate agents in that area</p>

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-lg animate-pulse">Loading agents...</div>
          ) : totalCount === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No agents in the directory yet — check back soon as we add agents nationwide.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredStates.sort((a, b) => a.name.localeCompare(b.name)).map(s => {
                const count = stateCounts[s.code] || 0;
                return (
                  <button
                    key={s.code}
                    onClick={() => handleSelectState(s.code)}
                    className="text-left rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-md group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-slate-800 group-hover:text-emerald-700">{s.code}</span>
                      <span className="text-xs text-slate-400 group-hover:text-emerald-500">→</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-tight mb-2">{s.name}</p>
                    <span className="text-xl font-bold text-emerald-600">{count.toLocaleString()}</span>
                    <p className="text-xs text-slate-400">agents</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 px-4 bg-slate-800 text-center">
        <h3 className="text-2xl font-serif font-bold text-white mb-3">Want to list your profile?</h3>
        <p className="text-slate-400 mb-6">Join EstateSalen.com and start receiving motivated seller leads</p>
        <Link to="/AgentSignup">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11 text-base">Get Started</Button>
        </Link>
      </section>

      <SharedFooter />
    </div>
  );
}