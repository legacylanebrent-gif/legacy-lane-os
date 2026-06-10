import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, ChevronRight, Loader2, X, Check } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

export default function InteractiveTerritorySelector({ form, setForm }) {
  const [selectedState, setSelectedState] = useState(null);
  const [counties, setCounties] = useState([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  // municipalitiesMap: { [county]: { loading, items } }
  const [municipalitiesMap, setMunicipalitiesMap] = useState({});

  useEffect(() => {
    if (!selectedState) { setCounties([]); return; }
    loadCounties(selectedState);
  }, [selectedState]);

  const loadCounties = async (state) => {
    setLoadingCounties(true);
    try {
      const data = await base44.entities.TerritoryLaunch.filter({ state });
      setCounties(data.sort((a, b) => (a.county || '').localeCompare(b.county || '')));
    } catch (e) {
      setCounties([]);
    } finally {
      setLoadingCounties(false);
    }
  };

  const loadMunicipalities = async (county) => {
    if (!selectedState) return;
    // Already loaded or loading
    if (municipalitiesMap[county]) return;
    setMunicipalitiesMap(prev => ({ ...prev, [county]: { loading: true, items: [] } }));
    try {
      const res = await base44.functions.invoke('getTerritoryMunicipalities', { county, state: selectedState });
      setMunicipalitiesMap(prev => ({
        ...prev,
        [county]: { loading: false, items: res.data?.municipalities || [] }
      }));
    } catch (e) {
      setMunicipalitiesMap(prev => ({ ...prev, [county]: { loading: false, items: [] } }));
    }
  };

  const handleSelectState = (state) => {
    setSelectedState(state);
    setMunicipalitiesMap({});
    if (!form.service_states.includes(state)) {
      setForm(p => ({ ...p, service_states: [...p.service_states, state] }));
    }
  };

  const handleToggleCounty = (county) => {
    const isSelected = form.service_counties.includes(county);
    if (isSelected) {
      // Deselect: remove county and its cities
      const munis = new Set((municipalitiesMap[county]?.items || []).map(m => m.name));
      setForm(p => ({
        ...p,
        service_counties: p.service_counties.filter(c => c !== county),
        service_cities: p.service_cities.filter(c => !munis.has(c)),
      }));
    } else {
      // Select: add county and start loading its municipalities
      setForm(p => ({ ...p, service_counties: [...p.service_counties, county] }));
      loadMunicipalities(county);
    }
  };

  const handleToggleCity = (cityName) => {
    const cities = form.service_cities || [];
    if (cities.includes(cityName)) {
      setForm(p => ({ ...p, service_cities: p.service_cities.filter(c => c !== cityName) }));
    } else {
      setForm(p => ({ ...p, service_cities: [...p.service_cities, cityName] }));
    }
  };

  const removeState = (s) => {
    setForm(p => ({ ...p, service_states: p.service_states.filter(x => x !== s) }));
    if (selectedState === s) { setSelectedState(null); setCounties([]); setMunicipalitiesMap({}); }
  };

  const removeCounty = (c) => {
    const munis = new Set((municipalitiesMap[c]?.items || []).map(m => m.name));
    setForm(p => ({
      ...p,
      service_counties: p.service_counties.filter(x => x !== c),
      service_cities: p.service_cities.filter(x => !munis.has(x)),
    }));
  };

  const selectAllForCounty = (county) => {
    const names = (municipalitiesMap[county]?.items || []).map(m => m.name);
    setForm(p => ({ ...p, service_cities: [...new Set([...p.service_cities, ...names])] }));
  };

  const clearAllForCounty = (county) => {
    const names = new Set((municipalitiesMap[county]?.items || []).map(m => m.name));
    setForm(p => ({ ...p, service_cities: p.service_cities.filter(c => !names.has(c)) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Service Area</CardTitle>
        <p className="text-sm text-slate-500">Select a state → counties → micro-territories for each county</p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* ── Step 1: States ── */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 bg-orange-600 text-white text-xs rounded-full flex items-center justify-center font-bold">1</span>
            Select States
          </p>
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
            {US_STATES.map(s => {
              const isSelected = form.service_states.includes(s);
              const isActive = selectedState === s;
              return (
                <button key={s} type="button" onClick={() => handleSelectState(s)}
                  className={`px-1.5 py-1 rounded text-xs font-medium border transition-all relative
                    ${isActive ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-300' :
                      isSelected ? 'bg-orange-100 text-orange-800 border-orange-400' :
                      'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}>
                  {s}
                  {isSelected && !isActive && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border border-white" />}
                </button>
              );
            })}
          </div>
          {form.service_states.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.service_states.map(s => (
                <Badge key={s} className="bg-orange-100 text-orange-800 border border-orange-300 gap-1 pr-1">
                  {s}
                  <button onClick={() => removeState(s)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ── Step 2: Counties ── */}
        {selectedState && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-cyan-600 text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
              Counties in {selectedState}
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 font-normal text-xs">Select counties to expand their micro-territories below</span>
            </p>
            {loadingCounties ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading counties...
              </div>
            ) : counties.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No counties found for {selectedState}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {counties.map(t => {
                  const county = t.county || t.data?.county;
                  const isSelected = form.service_counties.includes(county);
                  return (
                    <button key={t.id} type="button" onClick={() => handleToggleCounty(county)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${isSelected
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'}`}>
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {county}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: One section per selected county ── */}
        {form.service_counties.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
              Micro-Territories by County
            </p>
            {form.service_counties.map(county => {
              const muniData = municipalitiesMap[county];
              const items = muniData?.items || [];
              const loading = muniData?.loading;
              const selectedCount = items.filter(m => form.service_cities.includes(m.name)).length;

              return (
                <div key={county} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800">{county} County</span>
                      {!loading && items.length > 0 && (
                        <span className="text-xs text-slate-500">{selectedCount}/{items.length} selected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!loading && items.length > 0 && (
                        <>
                          <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => selectAllForCounty(county)}>
                            Select All
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-red-500"
                            onClick={() => clearAllForCounty(county)}>
                            Clear
                          </Button>
                        </>
                      )}
                      <button onClick={() => removeCounty(county)} className="text-slate-400 hover:text-red-500 ml-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading municipalities...
                    </div>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-slate-400">No municipalities found</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {items.map((m, i) => {
                        const isSelected = form.service_cities.includes(m.name);
                        return (
                          <button key={i} type="button" onClick={() => handleToggleCity(m.name)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left
                              ${isSelected
                                ? 'bg-purple-100 text-purple-800 border-purple-400'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                            {isSelected
                              ? <Check className="w-3 h-3 flex-shrink-0 text-purple-600" />
                              : <span className="w-3 h-3 flex-shrink-0" />}
                            <span className="truncate">{m.name}</span>
                            {m.type && <span className="text-slate-400 text-[10px] ml-auto flex-shrink-0">{m.type.slice(0, 3)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </CardContent>
    </Card>
  );
}