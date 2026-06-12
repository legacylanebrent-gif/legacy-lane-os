import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LocationSetter({ onLocationSet }) {
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveLocation = (lat, lng) => {
    const loc = { lat, lng };
    localStorage.setItem('userLocation', JSON.stringify(loc));
    onLocationSet(loc);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      return;
    }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
      },
      () => {
        setError('Location access denied. Please enter a ZIP code instead.');
        setLoading(false);
      }
    );
  };

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    if (!zip.trim() || zip.length < 5) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('geocodeZip', { zip: zip.trim() });
      const data = res.data;
      if (data?.lat && data?.lng) {
        saveLocation(data.lat, data.lng);
      } else {
        setError('Could not find that ZIP code. Try another.');
      }
    } catch (err) {
      setError('Unable to look up ZIP code. Try "Use My Location" instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-3">
      <p className="text-sm text-amber-800 font-medium flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        Set your location to find nearby companies
      </p>

      {/* Use My Location */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUseMyLocation}
        disabled={loading}
        className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        Use My Location
      </Button>

      {/* ZIP Code */}
      <form onSubmit={handleZipSubmit} className="flex gap-2">
        <Input
          placeholder="Enter ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          className="bg-white text-sm h-9"
          maxLength={5}
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || zip.length < 5}
          className="bg-amber-700 hover:bg-amber-800 text-white h-9 px-4"
        >
          Set
        </Button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}