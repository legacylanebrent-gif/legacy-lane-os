import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Map, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Two-tier territory selector:
 *  1. Master Territories = TerritoryLaunch county records filtered by user's state
 *  2. Micro-Territories = Housio sub-territories within selected counties
 *
 * Props:
 *  - state: string (e.g. "NJ" or "New Jersey")
 *  - selectedCountyIds: string[]  (TerritoryLaunch ids)
 *  - selectedMicroIds: string[]   (Housio territory ids)
 *  - onChange: ({ county_ids, micro_ids, county_names, micro_names }) => void
 */
export default function TerritoryServiceSelector({ state, selectedCountyIds = [], selectedMicroIds = [], onChange }) {
  const [masterTerritories, setMasterTerritories] = useState([]);
  const [microByCounty, setMicroByCounty] = useState({}); // countyId -> micro[]
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingMicro, setLoadingMicro] = useState({});
  const [expandedCounties, setExpandedCounties] = useState({});
  const [countySearch, setCountySearch] = useState('');
  const [microSearch, setMicroSearch] = useState('');

  // Load master (county) territories when state changes
  useEffect(() => {
    if (!state) { setMasterTerritories([]); return; }
    loadMasterTerritories();
  }, [state]);

  // Load micros for any newly selected counties
  useEffect(() => {
    selectedCountyIds.forEach(id => {
      if (!microByCounty[id]) loadMicroForCounty(id);
    });
  }, [selectedCountyIds]);

  const normalizeState = (s) => {
    if (!s) return '';
    // Convert full name to abbreviation or just uppercase
    const map = {
      'New Jersey': 'NJ', 'New York': 'NY', 'Florida': 'FL', 'California': 'CA',
      'Texas': 'TX', 'Pennsylvania': 'PA', 'Georgia': 'GA', 'Ohio': 'OH',
      'Illinois': 'IL', 'Michigan': 'MI', 'North Carolina': 'NC', 'Virginia': 'VA',
      'Washington': 'WA', 'Massachusetts': 'MA', 'Connecticut': 'CT', 'Maryland': 'MD',
      'Colorado': 'CO', 'Arizona': 'AZ', 'Tennessee': 'TN', 'Indiana': 'IN',
      'Missouri': 'MO', 'Wisconsin': 'WI', 'Minnesota': 'MN', 'South Carolina': 'SC',
      'Alabama': 'AL', 'Louisiana': 'LA', 'Kentucky': 'KY', 'Oregon': 'OR',
      'Oklahoma': 'OK', 'Nevada': 'NV', 'Iowa': 'IA', 'Utah': 'UT',
      'Arkansas': 'AR', 'Kansas': 'KS', 'Mississippi': 'MS', 'Nebraska': 'NE',
      'New Mexico': 'NM', 'Idaho': 'ID', 'West Virginia': 'WV', 'Hawaii': 'HI',
      'New Hampshire': 'NH', 'Maine': 'ME', 'Rhode Island': 'RI', 'Montana': 'MT',
      'Delaware': 'DE', 'South Dakota': 'SD', 'North Dakota': 'ND', 'Alaska': 'AK',
      'Vermont': 'VT', 'Wyoming': 'WY', 'District of Columbia': 'DC',
    };
    return map[s] || s.toUpperCase();
  };

  const loadMasterTerritories = async () => {
    setLoadingMaster(true);
    const abbr = normalizeState(state);
    const results = await base44.entities.TerritoryLaunch.filter({ state: abbr }, 'county', 200);
    setMasterTerritories(results);
    setLoadingMaster(false);
  };

  const loadMicroForCounty = async (countyTerritoryId) => {
    setLoadingMicro(prev => ({ ...prev, [countyTerritoryId]: true }));
    const county = masterTerritories.find(t => t.id === countyTerritoryId);
    if (!county) { setLoadingMicro(prev => ({ ...prev, [countyTerritoryId]: false })); return; }

    try {
      const res = await base44.functions.invoke('fetchHousioTerritories', {
        action: 'list',
        county: county.county,
        state: county.state,
      });
      const micros = res?.data?.territories || res?.data || [];
      setMicroByCounty(prev => ({ ...prev, [countyTerritoryId]: Array.isArray(micros) ? micros : [] }));
    } catch {
      setMicroByCounty(prev => ({ ...prev, [countyTerritoryId]: [] }));
    } finally {
      setLoadingMicro(prev => ({ ...prev, [countyTerritoryId]: false }));
    }
  };

  const toggleCounty = (territory) => {
    const id = territory.id;
    const isSelected = selectedCountyIds.includes(id);
    let newCountyIds, newMicroIds;

    if (isSelected) {
      // Deselect county + remove its micros
      const microsForCounty = (microByCounty[id] || []).map(m => String(m.id || m._id));
      newCountyIds = selectedCountyIds.filter(x => x !== id);
      newMicroIds = selectedMicroIds.filter(m => !microsForCounty.includes(m));
    } else {
      newCountyIds = [...selectedCountyIds, id];
      newMicroIds = selectedMicroIds;
      // Expand and load micros
      setExpandedCounties(prev => ({ ...prev, [id]: true }));
      if (!microByCounty[id]) loadMicroForCounty(id);
    }

    fireChange(newCountyIds, newMicroIds);
  };

  const toggleMicro = (micro, countyId) => {
    const id = String(micro.id || micro._id);
    const isSelected = selectedMicroIds.includes(id);
    const newMicroIds = isSelected
      ? selectedMicroIds.filter(x => x !== id)
      : [...selectedMicroIds, id];
    fireChange(selectedCountyIds, newMicroIds);
  };

  const fireChange = (countyIds, microIds) => {
    const countyNames = masterTerritories
      .filter(t => countyIds.includes(t.id))
      .map(t => `${t.county}, ${t.state}`);
    const microNames = [];
    Object.values(microByCounty).flat().forEach(m => {
      if (microIds.includes(String(m.id || m._id))) microNames.push(m.name || m.label || String(m.id));
    });
    onChange({ county_ids: countyIds, micro_ids: microIds, county_names: countyNames, micro_names: microNames });
  };

  const filteredMaster = masterTerritories.filter(t =>
    t.county?.toLowerCase().includes(countySearch.toLowerCase())
  );

  if (!state) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-sm text-slate-400">
        Set the state/address above to load available territories.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Step 1: Master (county) territories */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Map className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-slate-700">Master Territories (Counties)</span>
          {selectedCountyIds.length > 0 && (
            <Badge className="bg-purple-100 text-purple-700 text-xs">{selectedCountyIds.length} selected</Badge>
          )}
        </div>

        {loadingMaster ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading counties…
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b bg-slate-50">
              <Input
                placeholder="Search counties…"
                value={countySearch}
                onChange={e => setCountySearch(e.target.value)}
                className="h-7 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredMaster.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No counties found for {normalizeState(state)}</p>
              )}
              {filteredMaster.map(territory => {
                const isSelected = selectedCountyIds.includes(territory.id);
                const isExpanded = expandedCounties[territory.id];
                const micros = microByCounty[territory.id] || [];
                const isMicroLoading = loadingMicro[territory.id];

                return (
                  <div key={territory.id}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCounty(territory)}
                      />
                      <div className="flex-1 min-w-0" onClick={() => toggleCounty(territory)}>
                        <p className="text-sm font-medium text-slate-800">{territory.county} County</p>
                        <p className="text-xs text-slate-400">{territory.state} · FIPS {territory.fips_code || '—'}</p>
                      </div>
                      {isSelected && (
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-600 p-1"
                          onClick={() => setExpandedCounties(prev => ({ ...prev, [territory.id]: !isExpanded }))}
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Step 2: Micro-territories for this county */}
                    {isSelected && isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 pl-8 pr-3 py-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Micro-Territories</span>
                          {isMicroLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                        </div>
                        {!isMicroLoading && micros.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No micro-territories available for this county.</p>
                        )}
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {micros.map(micro => {
                            const mid = String(micro.id || micro._id);
                            const isChosen = selectedMicroIds.includes(mid);
                            return (
                              <div
                                key={mid}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-white transition-colors ${isChosen ? 'bg-blue-50' : ''}`}
                                onClick={() => toggleMicro(micro, territory.id)}
                              >
                                <Checkbox
                                  checked={isChosen}
                                  onCheckedChange={() => toggleMicro(micro, territory.id)}
                                />
                                <span className="text-xs text-slate-700">{micro.name || micro.label || mid}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary chips */}
      {(selectedCountyIds.length > 0 || selectedMicroIds.length > 0) && (
        <div className="text-xs text-slate-500 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
          <strong>{selectedCountyIds.length}</strong> county territories · <strong>{selectedMicroIds.length}</strong> micro-territories selected
        </div>
      )}
    </div>
  );
}