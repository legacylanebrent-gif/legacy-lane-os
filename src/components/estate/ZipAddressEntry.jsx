import React, { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

// ZIP → cities/state lookup using Google Maps Geocoding API
async function lookupZip(zip) {
  try {
    const res = await base44.functions.invoke('getConfig', {});
    const key = res.data?.GOOGLE_MAPS_API_KEY;
    if (!key) return null;
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${zip}|country:US&key=${key}`);
    const data = await r.json();
    if (!data.results?.length) return null;

    // Collect all city candidates from all results
    const cities = new Set();
    let state = '';
    for (const result of data.results) {
      for (const comp of result.address_components) {
        if (comp.types.includes('locality') || comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
          cities.add(comp.long_name);
        }
        if (comp.types.includes('administrative_area_level_1') && !state) {
          state = comp.short_name;
        }
      }
    }
    return { cities: [...cities], state };
  } catch {
    return null;
  }
}

async function geocodeFull(street, city, state, zip) {
  try {
    const res = await base44.functions.invoke('getConfig', {});
    const key = res.data?.GOOGLE_MAPS_API_KEY;
    if (!key) return null;
    const fullAddress = `${street}, ${city}, ${state} ${zip}`;
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${key}`);
    const data = await r.json();
    if (data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng, key };
    }
    return null;
  } catch {
    return null;
  }
}

export default function ZipAddressEntry({ address, location, onChange, onLocationChange }) {
  const [zip, setZip] = useState(address.zip || '');
  const [cityOptions, setCityOptions] = useState([]);
  const [zipState, setZipState] = useState(address.state || '');
  const [city, setCity] = useState(address.city || '');
  const [street, setStreet] = useState(address.street || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [mapKey, setMapKey] = useState('');
  const [mapLocation, setMapLocation] = useState(location || null);
  const geocodeTimer = useRef(null);

  // When zip reaches 5 digits, look up city/state
  useEffect(() => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setCityOptions([]);
      return;
    }
    setLookingUp(true);
    lookupZip(zip).then(result => {
      setLookingUp(false);
      if (result) {
        setCityOptions(result.cities);
        setZipState(result.state);
        // Auto-select if only one city
        if (result.cities.length === 1 && !city) {
          setCity(result.cities[0]);
          notifyChange({ zip, city: result.cities[0], state: result.state, street });
        } else {
          notifyChange({ zip, city, state: result.state, street });
        }
      }
    });
  }, [zip]);

  // Trigger geocode when street + city + state + zip are all present
  useEffect(() => {
    if (!street || !city || !zipState || !zip) return;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      const result = await geocodeFull(street, city, zipState, zip);
      setGeocoding(false);
      if (result) {
        const { key, ...loc } = result;
        setMapKey(key);
        setMapLocation(loc);
        onLocationChange(loc);
      }
    }, 800);
    return () => clearTimeout(geocodeTimer.current);
  }, [street, city, zipState, zip]);

  // Sync map key on load if we already have a location
  useEffect(() => {
    if (location && !mapKey) {
      base44.functions.invoke('getConfig', {}).then(res => {
        if (res.data?.GOOGLE_MAPS_API_KEY) setMapKey(res.data.GOOGLE_MAPS_API_KEY);
      });
    }
  }, []);

  const notifyChange = (fields) => {
    onChange({ ...address, ...fields });
  };

  const displayLocation = mapLocation || location;

  return (
    <div className="space-y-4">
      {/* Step 1: ZIP */}
      <div>
        <Label>ZIP Code *</Label>
        <Input
          placeholder="e.g. 07748"
          value={zip}
          maxLength={5}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setZip(val);
            notifyChange({ zip: val, city, state: zipState, street });
          }}
        />
        {lookingUp && <p className="text-xs text-slate-400 mt-1">Looking up ZIP…</p>}
      </div>

      {/* Step 2: City selection (shown after ZIP lookup) */}
      {zipState && (
        <div>
          <Label>City *</Label>
          {cityOptions.length > 1 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {cityOptions.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCity(c);
                    notifyChange({ zip, city: c, state: zipState, street });
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    city === c
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <Input
              value={city}
              placeholder="City"
              onChange={(e) => {
                setCity(e.target.value);
                notifyChange({ zip, city: e.target.value, state: zipState, street });
              }}
            />
          )}
        </div>
      )}

      {/* State (auto-filled, read-only) */}
      {zipState && (
        <div>
          <Label>State</Label>
          <Input value={zipState} readOnly className="bg-slate-50 text-slate-500" />
        </div>
      )}

      {/* Step 3: Street Address (shown after city selected) */}
      {city && zipState && (
        <div>
          <Label>Street Address</Label>
          <Input
            placeholder="123 Main Street"
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              notifyChange({ zip, city, state: zipState, street: e.target.value });
            }}
          />
          {geocoding && <p className="text-xs text-slate-400 mt-1">Locating address on map…</p>}
        </div>
      )}

      {/* Map preview */}
      {displayLocation && mapKey && (
        <div className="rounded-lg overflow-hidden border border-slate-200 mt-2">
          <p className="text-xs text-slate-500 px-2 pt-2 pb-1">📍 Verify the pin location — this is where your sale will appear on the map.</p>
          <img
            src={`https://maps.googleapis.com/maps/api/staticmap?center=${displayLocation.lat},${displayLocation.lng}&zoom=15&size=600x200&markers=color:red%7C${displayLocation.lat},${displayLocation.lng}&key=${mapKey}`}
            alt="Address map preview"
            className="w-full h-40 object-cover"
          />
        </div>
      )}
    </div>
  );
}