import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search, RefreshCw, Building2, Users, Star } from 'lucide-react';

async function fetchCitiesInCounty(county, state) {
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Act as a US geographic data researcher and data normalization engine.

Your task is to generate a COMPLETE and ACCURATE list of all municipalities within a given county in the United States.

-----------------------------------
INPUT:
County Name: ${county}
State: ${state}
-----------------------------------

STEP 1: DEFINE SCOPE

You MUST include ALL legally recognized municipal and census-recognized entities within the county, including:

- Cities
- Towns
- Townships
- Boroughs
- Villages
- Census-Designated Places (CDPs)
- Unincorporated communities (if commonly recognized)
- Special cases (e.g., consolidated city-counties, independent cities if relevant)

DO NOT assume naming conventions — each state uses different classifications.

-----------------------------------
STEP 2: SOURCE HIERARCHY (MANDATORY)

You must cross-check and compile data from:

1. U.S. Census Bureau (primary)
2. State government or official county website
3. Wikipedia (ONLY as a secondary aggregator, must verify)
4. Any official GIS or municipal directory if needed

If discrepancies exist:
- Prefer Census + State data over Wikipedia
- Resolve duplicates and naming inconsistencies

-----------------------------------
STEP 3: NORMALIZATION RULES

For each entry return:
- Name (standardized, no duplicates)
- Type (City, Township, Borough, CDP, Village, Town, Unincorporated Community, etc.)
- Incorporated status (Incorporated or Unincorporated)
- Notes (if naming ambiguity exists, otherwise empty string)

Normalize:
- Remove duplicates caused by alternate spellings
- Combine entries that refer to the same place
- Clearly distinguish between similarly named entities

-----------------------------------
STEP 4: EDGE CASE HANDLING

You MUST:
- Include townships even if they function as primary municipalities (e.g., New Jersey, Pennsylvania)
- Include CDPs that are commonly used in real estate or mailing addresses
- Flag overlapping jurisdictions
- Identify if the county has NO cities

-----------------------------------
STEP 5: VALIDATION

Before finalizing:
- Double-check that no major municipality is missing
- Ensure consistency with Census totals if available
- Confirm no duplicates exist

-----------------------------------

Return a JSON object with:
- "municipalities": array of objects with fields: name, type, incorporated (boolean), notes
- "total_count": number
- "breakdown": object mapping type names to counts (e.g. {"Township": 5, "Borough": 3})

Accuracy is more important than speed. Do NOT guess. If uncertain, note it in the notes field.`,
    response_json_schema: {
      type: "object",
      properties: {
        municipalities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              incorporated: { type: "boolean" },
              notes: { type: "string" }
            }
          }
        },
        total_count: { type: "number" },
        breakdown: { type: "object" }
      }
    }
  });

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
  const [cities, setCities] = useState([]); // plain name list for matching
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeMatches, setActiveMatches] = useState([]);
  const [prospectMatches, setProspectMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState('');

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

      // If cities already saved, use them directly
      if (app.territory_cities && app.territory_cities.length > 0) {
        const saved = app.territory_cities;
        setCities(saved);
        // Reconstruct municipality objects from saved plain list if no rich data
        setMunicipalities(saved.map(name => ({ name, type: '', incorporated: true, notes: '' })));
        await loadOperatorMatches(saved, app.license_state);
      } else {
        // Auto-fetch if not yet populated
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
      const result = await fetchCitiesInCounty(app.county_requested, app.license_state);
      const munis = (result.municipalities || []).sort((a, b) => a.name.localeCompare(b.name));
      const nameList = munis.map(m => m.name);

      setMunicipalities(munis);
      setBreakdown(result.breakdown || {});
      setCities(nameList);

      // Save plain name list to database
      await base44.entities.AgentTerritoryApplication.update(app.id, { territory_cities: nameList });
      setApplication(prev => ({ ...prev, territory_cities: nameList }));

      await loadOperatorMatches(nameList, app.license_state);
    } catch (e) {
      setError(e.message || 'Failed to fetch cities.');
    } finally {
      setLoadingCities(false);
    }
  };

  const loadOperatorMatches = async (cityList, state) => {
    if (!cityList || cityList.length === 0) return;
    setLoadingMatches(true);
    try {
      const citySet = new Set(cityList.map(c => c.toLowerCase().trim()));
      const stateUpper = (state || '').toUpperCase().trim();

      // FutureEstateOperator uses source_state as the full state name OR abbreviation
      // Try filtering by state abbreviation field first, then fall back matching
      const [activeOps, futureLeads] = await Promise.all([
        base44.entities.FutureEstateOperator.filter({ state: stateUpper }),
        base44.entities.FutureOperatorLead.filter({ state: stateUpper }),
      ]);

      // Match active operators by city
      const activeFound = activeOps
        .filter(op => op.city && citySet.has(op.city.toLowerCase().trim()))
        .map(op => ({ ...op, matchedCity: op.city }));

      // Match future operator leads by city
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
    setCities([]);
    setMunicipalities([]);
    setBreakdown({});
    setActiveMatches([]);
    setProspectMatches([]);
    await fetchAndSaveCities(application);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {application?.county_requested ? `${application.county_requested} County, ${application.license_state}` : 'Territory Cities'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">All municipalities within your assigned county territory</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingCities} className="flex items-center gap-1.5 text-xs">
          {loadingCities ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh Cities
        </Button>
      </div>

      {/* City list */}
      <Card className="border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-slate-800 text-sm">Cities & Municipalities</span>
            {cities.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">{cities.length}</Badge>
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
              {Object.keys(breakdown).length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
                  {Object.entries(breakdown).map(([type, count]) => (
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
                    </tr>
                  </thead>
                  <tbody>
                    {municipalities.map((m, i) => (
                      <tr key={m.name + i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                        <td className="px-4 py-2">
                          {m.type ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-700 border border-orange-200">{m.type}</span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6 px-4">No municipalities loaded yet. Click "Refresh Cities" to fetch.</p>
          )}
        </CardContent>
      </Card>

      {/* Operator matches */}
      {cities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active operators in territory */}
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

          {/* Prospect / future operators */}
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