import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronRight, Loader2, X, Check } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

export default function InteractiveTerritorySelector({ form, setForm }) {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [counties, setCounties] = useState([]);   // TerritoryLaunch records for the selected state
  const [municipalities, setMunicipalities] = useState([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingMunis, setLoadingMunis] = useState(false);

  // When state changes, load counties from TerritoryLaunch
  useEffect(() => {
    if (!selectedState) { setCounties([]); setSelectedCounty(null); setMunicipalities([]); return; }
    loadCounties(selectedState);
  }, [selectedState]);

  // When county changes, load municipalities via backend function
  useEffect(() => {
    if (!selectedCounty || !selectedState) { setMunicipalities([]); return; }
    loadMunicipalities(selectedCounty, selectedState);
  }, [selectedCounty]);

  const loadCounties = async (state) => {
    setLoadingCounties(true);
    setSelectedCounty(null);
    setMunicipalities([]);
    try {
      const data = await base44.entities.TerritoryLaunch.filter({ state });
      setCounties(data.sort((a, b) => (a.county || '').localeCompare(b.county || '')));
    } catch (e) {
      console.error('Error loading counties:', e);
      setCounties([]);
    } finally {
      setLoadingCounties(false);
    }
  };

  const loadMunicipalities = async (county, state) => {
    setLoadingMunis(true);
    setMunicipalities([]);
    try {
      const res = await base44.functions.invoke('getTerritoryMunicipalities', { county, state });
      setMunicipalities(res.data?.municipalities || []);
    } catch (e) {
      console.error('Error loading municipalities:', e);
      setMunicipalities([]);
    } finally {
      setLoadingMunis(false);
    }
  };

  const handleSelectState = (state) => {
    // Also add to form.service_states
    setSelectedState(state);
    if (!form.service_states.includes(state)) {
      setForm(p => ({ ...p, service_states: [...p.service_states, state] }));
    }
  };

  const handleToggleCounty = (county) => {
    const counties = form.service_counties || [];
    if (counties.includes(county)) {
      setForm(p => ({ ...p, service_counties: p.service_counties.filter(c => c !== county) }));
    } else {
      setForm(p => ({ ...p, service_counties: [...p.service_counties, county] }));
    }
    setSelectedCounty(county);
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
    if (selectedState === s) { setSelectedState(null); setSelectedCounty(null); }
  };

  const removeCounty = (c) => {
    setForm(p => ({ ...p, service_counties: p.service_counties.filter(x => x !== c) }));
    if (selectedCounty === c) { setSelectedCounty(null); setMunicipalities([]); }
  };

  const removeCity = (c) => setForm(p => ({ ...p, service_cities: p.service_cities.filter(x => x !== c) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Service Area</CardTitle>
        <p className="text-sm text-slate-500">Select a state → then counties → then micro-territories (cities/boroughs)</p>
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
              <span className="text-slate-500 font-normal text-xs">Click a county to load its micro-territories</span>
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
                  const county = t.county || (t.data?.county);
                  const isSelected = form.service_counties.includes(county);
                  const isActive = selectedCounty === county;
                  return (
                    <button key={t.id} type="button" onClick={() => handleToggleCounty(county)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${isActive ? 'bg-cyan-600 text-white border-cyan-600 ring-2 ring-cyan-200' :
                          isSelected ? 'bg-cyan-100 text-cyan-800 border-cyan-400' :
                          'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'}`}>
                      {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                      {county}
                    </button>
                  );
                })}
              </div>
            )}
            {form.service_counties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.service_counties.map(c => (
                  <Badge key={c} className="bg-cyan-100 text-cyan-800 border border-cyan-300 gap-1 pr-1">
                    {c}
                    <button onClick={() => removeCounty(c)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Micro-Territories (Municipalities) ── */}
        {selectedCounty && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
              Micro-Territories in {selectedCounty} County, {selectedState}
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 font-normal text-xs">Select specific towns/boroughs</span>
            </p>
            {loadingMunis ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading municipalities...
              </div>
            ) : municipalities.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No micro-territories loaded yet</p>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => {
                      const names = municipalities.map(m => m.name);
                      setForm(p => ({ ...p, service_cities: [...new Set([...p.service_cities, ...names])] }));
                    }}>
                    Select All ({municipalities.length})
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-red-500"
                    onClick={() => {
                      const names = new Set(municipalities.map(m => m.name));
                      setForm(p => ({ ...p, service_cities: p.service_cities.filter(c => !names.has(c)) }));
                    }}>
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {municipalities.map((m, i) => {
                    const isSelected = form.service_cities.includes(m.name);
                    return (
                      <button key={i} type="button" onClick={() => handleToggleCity(m.name)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left
                          ${isSelected ? 'bg-purple-100 text-purple-800 border-purple-400' :
                            'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50'}`}>
                        {isSelected ? <Check className="w-3 h-3 flex-shrink-0 text-purple-600" /> : <span className="w-3 h-3 flex-shrink-0" />}
                        <span className="truncate">{m.name}</span>
                        {m.type && <span className="text-slate-400 text-[10px] ml-auto flex-shrink-0">{m.type.slice(0,3)}</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {form.service_cities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {form.service_cities.map(c => (
                  <Badge key={c} className="bg-purple-100 text-purple-800 border border-purple-300 gap-1 pr-1 text-xs">
                    {c}
                    <button onClick={() => removeCity(c)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}