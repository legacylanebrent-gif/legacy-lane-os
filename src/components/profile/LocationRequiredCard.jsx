import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Loader2, AlertTriangle, Check } from 'lucide-react';

export default function LocationRequiredCard({ user, form, setForm, onLocationSaved }) {
  const [zip, setZip] = useState(form.business_address_zip || form.address_zip || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [geoMode, setGeoMode] = useState(false);

  const saveLocation = async (lat, lng) => {
    const loc = { lat, lng };
    await base44.auth.updateMe({ location: loc });
    onLocationSaved(loc);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser.');
      return;
    }
    setGeoMode(true);
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.latitude, pos.coords.longitude);
        setLoading(false);
        setGeoMode(false);
      },
      () => {
        setError('Location access denied. Please enter a ZIP code instead.');
        setLoading(false);
        setGeoMode(false);
      }
    );
  };

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    const zipToUse = zip.trim();
    if (!zipToUse || zipToUse.length < 5) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('geocodeZip', { zip: zipToUse });
      const data = res.data;
      if (data?.lat && data?.lng) {
        await saveLocation(data.lat, data.lng);
        setForm(p => ({ ...p, address_zip: zipToUse, business_address_zip: zipToUse }));
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
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Set Your Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-amber-800">
          Your location is required to appear in searches and be matched with customers in your area.
          Enter your ZIP code or use your current location to get started.
        </p>

        {success ? (
          <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-lg">
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-sm">Location saved successfully!</span>
          </div>
        ) : (
          <>
            {/* Use My Location */}
            <Button
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={loading}
              className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 gap-2"
            >
              {loading && geoMode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              Use My Location
            </Button>

            {/* ZIP Code */}
            <div>
              <Label className="text-amber-800 mb-1 block">ZIP Code</Label>
              <form onSubmit={handleZipSubmit} className="flex gap-2">
                <Input
                  placeholder="e.g. 07748"
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
                  {loading && !geoMode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
                </Button>
              </form>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}