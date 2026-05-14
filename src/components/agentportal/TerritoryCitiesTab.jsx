import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, RefreshCw, Building2, Users, Star, Plus, X, Check } from 'lucide-react';

const STATE_ABBREV = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO',
  'Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID',
  'Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
  'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
  'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC'
};

function normalizeState(s) {
  if (!s) return '';
  const upper = s.trim().toUpperCase();
  if (upper.length === 2) return upper; // already abbreviation
  return STATE_ABBREV[s.trim()] || upper;
}

async function fetchCitiesFromAPI(county, state) {
  const response = await base44.functions.invoke('getTerritoryMunicipalities', { county, state });
  const result = response.data;
  return {
    municipalities: result?.municipalities || [],
    total_count: result?.total_count || 0,
    breakdown: result?.breakdown || {}
  };
}

function OperatorMatchCard({ operator, type }) {
  const isActive = type === 'active';
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-100' : 'bg-orange-100'}`}>
          {isActive ? <Users className="w-4 h-4 text-emerald-600" /> : <Building2 className="w-4 h-4 text-orange-600" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">{operator.company_name}</p>
          <p className="text-xs text-slate-500 truncate">{operator.city}{operator.state ? `, ${operator.state}` : ''}</p>
          {operator.matchedCity && (
            <p className="text-xs font-medium mt-0.5 truncate" style={{ color: isActive ? '#059669' : '#ea580c' }}>
              Matched: {operator.matchedCity}
            </p>
          )}
        </div>
      </div>
      <Badge className={`shrink-0 ml-2 text-xs ${isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'} border`}>
        {isActive ? 'Active' : 'Prospect'}
      </Badge>
    </div>
  );
}

export default function TerritoryCitiesTab({ user }) {
  const [application, setApplication] = useState(null);
  const [municipalities, setMunicipalities] = useState([]);
  const [breakdown, setBreakdown] = useState({});
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeMatches, setActiveMatches] = useState([]);
  const [prospectMatches, setProspectMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState('');

  // Add city state
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityType, setNewCityType] = useState('');
  const [addingCity, setAddingCity] = useState(false);

  useEffect(() => {
    if (user) loadApplication();
  }, [user]);

  const loadApplication = async () => {
    setLoadingData(true);
    setError('');
    try {
      const apps = await base44.entities.AgentTerritoryApplication.filter({ email: user?.email });
      const app = apps.find(a => a.status === 'approved') || apps[0];
      if (!app) { setError('No territory application found.'); setLoadingData(false); return; }
      setApplication(app);

      // If rich municipality data is already cached in DB, use it
      if (app.territory_municipalities && app.territory_municipalities.length > 0) {
        // Full rich data available
        setMunicipalities(app.territory_municipalities);
        const nameList = app.territory_municipalities.map(m => m.name);
        await loadOperatorMatches(nameList, app.license_state, app.county_requested);
      } else if (app.territory_cities && app.territory_cities.length > 0) {
        // Legacy: plain names only — show them while we note type/status will be missing
        const saved = app.territory_cities.map(name => ({ name, type: '', incorporated: null, notes: '' }));
        setMunicipalities(saved);
        await loadOperatorMatches(app.territory_cities, app.license_state, app.county_requested);
      } else {
        // First time — fetch from OpenAI and cache
        await fetchAndSaveCities(app);
      }
    } catch (e) {
      setError(e.message || 'Failed to load territory data.');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAndSaveCities = async (app) => {
    if (!app?.county_requested || !app?.license_state) {
      setError('County or state not assigned to your application yet.');
      return;
    }
    setLoadingCities(true);
    setError('');
    try {
      const result = await fetchCitiesFromAPI(app.county_requested, app.license_state);
      const munis = (result.municipalities || []).sort((a, b) => a.name.localeCompare(b.name));
      const nameList = munis.map(m => m.name);

      setMunicipalities(munis);
      setBreakdown(result.breakdown || {});

      // Save both plain name list AND full rich data to DB
      await base44.entities.AgentTerritoryApplication.update(app.id, {
        territory_cities: nameList,
        territory_municipalities: munis
      });
      setApplication(prev => ({ ...prev, territory_cities: nameList, territory_municipalities: munis }));

      await loadOperatorMatches(nameList, app.license_state, app.county_requested);
    } catch (e) {
      setError(e.message || 'Failed to fetch cities.');
    } finally {
      setLoadingCities(false);
    }
  };

  const loadOperatorMatches = async (cityList, state, county) => {
    if (!cityList || cityList.length === 0) return;
    setLoadingMatches(true);
    try {
      const citySet = new Set(cityList.map(c => c.toLowerCase().trim()));
      const stateAbbr = normalizeState(state);

      // Build geocoded_county filter value
      const countyRaw = county || application?.county_requested || '';
      const countyNorm = countyRaw.replace(/\s+county$/i, '').trim();
      const countyWithSuffix = countyNorm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') + ' County';

      // Fetch FutureEstateOperators for this county (geocoded) + FutureOperatorLeads by state
      const [countyOps, futureLeads] = await Promise.all([
        base44.entities.FutureEstateOperator.filter({ state: stateAbbr, geocode_status: 'geocoded', geocoded_county: countyWithSuffix }, '-updated_date', 200),
        base44.entities.FutureOperatorLead.filter({ state: stateAbbr }, '-updated_date', 200).catch(() => []),
      ]);

      // Match against territory city list using geocoded_city field
      const activeFound = countyOps.map(op => {
        const gcCity = (op.geocoded_city || '').toLowerCase().trim();
        const rawCity = (op.city || '').toLowerCase().trim();
        const matched = citySet.has(gcCity) ? op.geocoded_city : citySet.has(rawCity) ? op.city : null;
        return matched ? { ...op, matchedCity: matched } : null;
      }).filter(Boolean);

      const prospectFound = futureLeads
        .filter(lead => lead.city && citySet.has(lead.city.toLowerCase().trim()))
        .map(lead => ({ ...lead, matchedCity: lead.city }));

      setActiveMatches(activeFound);
      setProspectMatches(prospectFound);
    } catch (e) {
      console.error('Error loading operator matches:', e);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleRefresh = async () => {
    if (!application) return;
    setMunicipalities([]);
    setBreakdown({});
    setActiveMatches([]);
    setProspectMatches([]);
    // Clear cached data so it re-fetches from OpenAI
    await base44.entities.AgentTerritoryApplication.update(application.id, { territory_cities: [], territory_municipalities: [] });
    setApplication(prev => ({ ...prev, territory_cities: [], territory_municipalities: [] }));
    await fetchAndSaveCities({ ...application, territory_cities: [], territory_municipalities: [] });
  };

  const handleAddCity = async () => {
    const trimmed = newCityName.trim();
    if (!trimmed || !application) return;
    setAddingCity(true);
    try {
      // Check not already in list
      const existing = (application.territory_cities || []).map(c => c.toLowerCase());
      if (existing.includes(trimmed.toLowerCase())) {
        setNewCityName('');
        setShowAddCity(false);
        setAddingCity(false);
        return;
      }

      const newMuni = { name: trimmed, type: newCityType || 'Manually Added', incorporated: null, notes: 'Manually added' };
      const updatedList = [...(application.territory_cities || []), trimmed].sort();
      const updatedMunis = [...(application.territory_municipalities || municipalities), newMuni].sort((a, b) => a.name.localeCompare(b.name));

      await base44.entities.AgentTerritoryApplication.update(application.id, {
        territory_cities: updatedList,
        territory_municipalities: updatedMunis
      });
      setApplication(prev => ({ ...prev, territory_cities: updatedList, territory_municipalities: updatedMunis }));
      setMunicipalities(updatedMunis);

      // Re-run operator matching with updated list
      await loadOperatorMatches(updatedList, application.license_state, application.county_requested);

      setNewCityName('');
      setNewCityType('');
      setShowAddCity(false);
    } catch (e) {
      setError(e.message || 'Failed to add city.');
    } finally {
      setAddingCity(false);
    }
  };

  const handleRemoveCity = async (cityName) => {
    if (!application) return;
    const updatedList = (application.territory_cities || []).filter(c => c !== cityName);
    const updatedMunis = municipalities.filter(m => m.name !== cityName);
    await base44.entities.AgentTerritoryApplication.update(application.id, {
      territory_cities: updatedList,
      territory_municipalities: updatedMunis
    });
    setApplication(prev => ({ ...prev, territory_cities: updatedList, territory_municipalities: updatedMunis }));
    setMunicipalities(updatedMunis);
    await loadOperatorMatches(updatedList, application.license_state, application.county_requested);
  };

  // Compute breakdown from municipalities if we loaded from cache
  const displayBreakdown = Object.keys(breakdown).length > 0
    ? breakdown
    : municipalities.reduce((acc, m) => {
        if (m.type && m.type !== 'Manually Added') acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      }, {});

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
        <p className="text-sm text-slate-500">Loading territory data…</p>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <MapPin className="w-8 h-8 text-slate-300" />
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {application?.county_requested ? `${application.county_requested} County, ${application.license_state}` : 'Territory Cities'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">All municipalities within your assigned county territory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCity(v => !v)}
            className="flex items-center gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add City
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingCities} className="flex items-center gap-1.5 text-xs">
            {loadingCities ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Re-fetch from AI
          </Button>
        </div>
      </div>

      {/* Add City Inline Form */}
      {showAddCity && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Add a City / Municipality Manually</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="City or municipality name…"
                value={newCityName}
                onChange={e => setNewCityName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCity()}
                className="max-w-xs text-sm"
              />
              <Input
                placeholder="Type (optional, e.g. Borough)"
                value={newCityType}
                onChange={e => setNewCityType(e.target.value)}
                className="max-w-xs text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddCity}
                disabled={!newCityName.trim() || addingCity}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5"
              >
                {addingCity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddCity(false); setNewCityName(''); setNewCityType(''); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* City list */}
      <Card className="border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-slate-800 text-sm">Cities & Municipalities</span>
            {municipalities.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">{municipalities.length}</Badge>
            )}
            {application?.territory_municipalities?.length > 0 && (
              <span className="text-xs text-slate-400 ml-1">· Loaded from saved data</span>
            )}
          </div>
          {loadingCities && (
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Fetching from AI…
            </span>
          )}
        </div>
        <CardContent className="p-0">
          {loadingCities && municipalities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-xs text-slate-400">Researching all municipalities in your county…</p>
            </div>
          ) : municipalities.length > 0 ? (
            <>
              {/* Breakdown bar */}
              {Object.keys(displayBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  {Object.entries(displayBreakdown).map(([type, count]) => (
                    <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="font-semibold text-slate-800">{count}</span> {type}
                    </span>
                  ))}
                </div>
              )}
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {municipalities.map((m, i) => (
                      <tr key={m.name + i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-2">
                          {m.type ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${m.notes === 'Manually added' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                              {m.type}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2">
                          {m.incorporated !== undefined && m.incorporated !== null ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs border ${m.incorporated ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {m.incorporated ? 'Incorporated' : 'Unincorporated'}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-400 italic">{m.notes || ''}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveCity(m.name)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500"
                            title="Remove city"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6 px-4">No municipalities loaded yet. Click "Re-fetch from AI" to populate.</p>
          )}
        </CardContent>
      </Card>

      {/* Operator matches */}
      {municipalities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-emerald-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-100 bg-emerald-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800 text-sm">Active Operators in Territory</span>
                {!loadingMatches && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">{activeMatches.length}</Badge>
                )}
              </div>
              {loadingMatches && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </div>
            <CardContent className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {loadingMatches ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : activeMatches.length > 0 ? (
                activeMatches.map((op, i) => <OperatorMatchCard key={op.id || i} operator={op} type="active" />)
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No active operators found in these cities.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-orange-100 bg-orange-50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-slate-800 text-sm">Prospect Operators in Territory</span>
                {!loadingMatches && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">{prospectMatches.length}</Badge>
                )}
              </div>
              {loadingMatches && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
            </div>
            <CardContent className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {loadingMatches ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : prospectMatches.length > 0 ? (
                prospectMatches.map((op, i) => <OperatorMatchCard key={op.id || i} operator={op} type="prospect" />)
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No prospect operators found in these cities.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}