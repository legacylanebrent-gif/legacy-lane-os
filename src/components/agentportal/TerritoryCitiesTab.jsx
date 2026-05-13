import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search, RefreshCw, Building2, Users, Star } from 'lucide-react';

// Fetch cities in a county via Google Maps Places + Geocoding
async function fetchCitiesInCounty(county, state, apiKey) {
  // Use the LLM integration to get a comprehensive city list for the county
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `List all cities, towns, boroughs, townships, and municipalities located within ${county} County, ${state}, USA. 
    Return ONLY a JSON array of strings with the city/town names, nothing else. 
    Be comprehensive and include all incorporated places, unincorporated communities, and notable neighborhoods.
    Example format: ["City A", "Town B", "Borough C"]`,
    response_json_schema: {
      type: "object",
      properties: {
        cities: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  });
  return result?.cities || [];
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
  const [cities, setCities] = useState([]);
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
        setCities(app.territory_cities);
        await loadOperatorMatches(app.territory_cities, app.license_state);
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
      const fetched = await fetchCitiesInCounty(app.county_requested, app.license_state);
      const sorted = [...fetched].sort();
      setCities(sorted);

      // Save to database
      await base44.entities.AgentTerritoryApplication.update(app.id, { territory_cities: sorted });
      setApplication(prev => ({ ...prev, territory_cities: sorted }));

      await loadOperatorMatches(sorted, app.license_state);
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

      // Search active operators (FutureEstateOperator) — already in system
      const [activeOps, futureLeads] = await Promise.all([
        base44.entities.FutureEstateOperator.filter({ source_state: state }),
        base44.entities.FutureOperatorLead.list(),
      ]);

      // Match active operators by city
      const activeFound = activeOps
        .filter(op => op.city && citySet.has(op.city.toLowerCase().trim()))
        .map(op => ({ ...op, matchedCity: op.city }));

      // Match future operator leads by city + state
      const stateUpper = state?.toUpperCase();
      const prospectFound = futureLeads
        .filter(lead =>
          lead.city &&
          citySet.has(lead.city.toLowerCase().trim()) &&
          (lead.state?.toUpperCase() === stateUpper || lead.source_state?.toUpperCase() === stateUpper)
        )
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
    // Force re-fetch from AI
    const appWithoutCities = { ...application, territory_cities: [] };
    setApplication(appWithoutCities);
    setCities([]);
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
        <CardContent className="p-4">
          {loadingCities && cities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
              <p className="text-xs text-slate-400">Building city list for your county…</p>
            </div>
          ) : cities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cities.map(city => (
                <span key={city} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />{city}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No cities loaded yet. Click "Refresh Cities" to fetch.</p>
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