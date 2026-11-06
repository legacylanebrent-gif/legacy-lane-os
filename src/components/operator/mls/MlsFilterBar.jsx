import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Save, RotateCcw, Ruler, MapPin, DollarSign, ChevronDown } from 'lucide-react';
import { DISTANCE_STEPS, SORT_OPTIONS, formatPrice } from './mlsFilters';

function Chip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
    >
      {children}
      <ChevronDown className="w-3 h-3 opacity-60" />
    </button>
  );
}

export default function MlsFilterBar({
  filters,
  onChange,
  cities,
  radiusMiles,
  onSave,
  onReset,
  saving,
  isSaved,
}) {
  const [panel, setPanel] = useState(null);
  const toggle = (name) => setPanel((p) => (p === name ? null : name));

  const distanceLabel = filters.max_miles ? `${filters.max_miles} mi` : 'My full radius';
  const cityLabel = filters.cities.length
    ? `${filters.cities.length} cit${filters.cities.length === 1 ? 'y' : 'ies'}`
    : 'All cities';
  const priceLabel =
    filters.price_min || filters.price_max
      ? `${filters.price_min ? formatPrice(filters.price_min) : 'Any'} – ${
          filters.price_max ? formatPrice(filters.price_max) : 'Any'
        }`
      : 'Any price';

  const distanceOptions = [...DISTANCE_STEPS.filter((m) => m <= radiusMiles), radiusMiles];

  const toggleCity = (name) => {
    const has = filters.cities.includes(name);
    onChange({
      cities: has ? filters.cities.filter((c) => c !== name) : [...filters.cities, name],
    });
  };

  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={!!filters.max_miles} onClick={() => toggle('distance')}>
          <Ruler className="w-3 h-3" />
          {distanceLabel}
        </Chip>
        <Chip active={filters.cities.length > 0} onClick={() => toggle('cities')}>
          <MapPin className="w-3 h-3" />
          {cityLabel}
        </Chip>
        <Chip
          active={!!(filters.price_min || filters.price_max)}
          onClick={() => toggle('price')}
        >
          <DollarSign className="w-3 h-3" />
          {priceLabel}
        </Chip>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className="ml-auto rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {panel === 'distance' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Distance from your service ZIP
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ max_miles: null })}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                !filters.max_miles ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Full radius
            </button>
            {distanceOptions.map((m, i) => (
              <button
                key={`${m}-${i}`}
                type="button"
                onClick={() => onChange({ max_miles: m })}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  Number(filters.max_miles) === m
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {m} mi
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'cities' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Cities in range
            </p>
            {filters.cities.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ cities: [] })}
                className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800"
              >
                Clear
              </button>
            )}
          </div>
          {cities.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-slate-500">No cities in range yet.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              {cities.map((city) => {
                const checked = filters.cities.includes(city.name);
                return (
                  <button
                    key={city.name}
                    type="button"
                    onClick={() => toggleCity(city.name)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left hover:bg-white"
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                        checked ? 'border-cyan-600 bg-cyan-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="flex-1 truncate text-xs font-medium text-slate-800">
                      {city.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{city.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {panel === 'price' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Listing price
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={filters.price_min}
              onChange={(e) => onChange({ price_min: e.target.value })}
              className="h-8 bg-white text-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={filters.price_max}
              onChange={(e) => onChange({ price_max: e.target.value })}
              className="h-8 bg-white text-xs"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving || isSaved}
          className="h-8 gap-1.5 bg-slate-900 text-xs text-white hover:bg-slate-800"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isSaved ? 'Saved as default' : saving ? 'Saving…' : 'Save as default'}
        </Button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>
    </div>
  );
}