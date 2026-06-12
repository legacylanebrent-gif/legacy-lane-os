import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Navigation, Loader2, AlertTriangle, Check, Building2 } from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

export default function LocationRequiredCard({ user, form, setForm, onLocationSaved }) {
  const [zip, setZip] = useState(form.business_address_zip || form.address_zip || '');
  const [city, setCity] = useState(form.business_address_city || '');
  const [state, setState] = useState(form.business_address_state || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [geoMode, setGeoMode] = useState(false);
  const [tab, setTab] = useState('city');

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
        setError('Location access denied. Try city + state or ZIP code instead.');
        setLoading(false);
        setGeoMode(false);
      }
    );
  };

  const handleCitySubmit = async (e) => {
    e.preventDefault();
    const c = city.trim();
    const s = state.trim();
    if (!c || !s) return;
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('geocodeCity', { city: c, state: s });
      const data = res.data;
      if (data?.lat && data?.lng) {
        await saveLocation(data.lat, data.lng);
        setForm(p => ({ ...p, business_address_city: c, business_address_state: s }));
      } else {
        setError('Could not find that city and state. Try another.');
      }
    } catch (err) {
      setError('Unable to look up location. Try another option.');
    } finally {
      setLoading(false);
    }
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
      setError('Unable to look up ZIP code. Try another option.');
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
          Your general location is required to appear in searches and be matched with customers in your area.
          Use your city + state, ZIP code, or current location — no street address needed.
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

            <div className="text-center text-xs text-amber-600 font-medium">— or —</div>

            {/* Tabs: City+State | ZIP */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex w-full bg-amber-100 p-0.5 rounded-lg h-auto">
                <TabsTrigger value="city" className="flex-1 rounded-md text-xs py-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-sm">
                  <Building2 className="w-3.5 h-3.5 mr-1" /> City + State
                </TabsTrigger>
                <TabsTrigger value="zip" className="flex-1 rounded-md text-xs py-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-800 data-[state=active]:shadow-sm">
                  <MapPin className="w-3.5 h-3.5 mr-1" /> ZIP Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="city" className="mt-3">
                <form onSubmit={handleCitySubmit} className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-white text-sm h-9 flex-1 min-w-[120px]"
                  />
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="h-9 rounded-md border border-input bg-white px-2 text-sm w-[80px]"
                  >
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading || !city.trim() || !state.trim()}
                    className="bg-amber-700 hover:bg-amber-800 text-white h-9 px-4"
                  >
                    {loading && !geoMode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="zip" className="mt-3">
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
              </TabsContent>
            </Tabs>

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