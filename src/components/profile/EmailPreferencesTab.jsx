import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Building2, Save, CheckCircle2, Loader2, Bell } from 'lucide-react';

const RADIUS_OPTIONS = [10, 25, 50, 100];

export default function EmailPreferencesTab({ user, compact = false }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const res = await base44.functions.invoke('emailPreferencesManager', { action: 'getPreferences' });
      if (res.data?.success) setPrefs(res.data.preferences);
    } catch (err) {
      console.error('Error loading email preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await base44.functions.invoke('emailPreferencesManager', {
        action: 'savePreferences',
        preferences: {
          estate_salen_marketing: prefs.estate_salen_marketing,
          local_sale_notifications: prefs.local_sale_notifications,
          company_direct_emails: prefs.company_direct_emails,
          cool_finds_blog_email: prefs.cool_finds_blog_email,
          cool_finds_blog_in_app: prefs.cool_finds_blog_in_app,
          notification_radius_miles: prefs.notification_radius_miles,
          location_city: prefs.location_city,
          location_state: prefs.location_state,
          location_zip: prefs.location_zip,
        },
      });
      if (res.data?.success) {
        setPrefs(res.data.preferences);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving email preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!prefs) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          Unable to load email preferences. Please try again later.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-orange-600" />
            Email Preferences
          </CardTitle>
          <p className="text-sm text-slate-500">
            Control which types of emails you receive from EstateSalen and the companies you follow.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* EstateSalen Marketing */}
          <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">EstateSalen News & Updates</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Platform announcements, new features, and business tips from EstateSalen. Sent occasionally.
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.estate_salen_marketing}
              onCheckedChange={(v) => setPrefs({ ...prefs, estate_salen_marketing: v })}
            />
          </div>

          {/* Local Sale Notifications */}
          <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Local Estate Sale Alerts</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Get notified about estate sales happening in your area. Choose your radius below.
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.local_sale_notifications}
              onCheckedChange={(v) => setPrefs({ ...prefs, local_sale_notifications: v })}
            />
          </div>

          {/* Radius selector */}
          {prefs.local_sale_notifications && (
            <div className="ml-8 p-3 bg-white border border-slate-200 rounded-lg">
              <Label className="text-xs text-slate-500">Notification Radius</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setPrefs({ ...prefs, notification_radius_miles: r })}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      prefs.notification_radius_miles === r
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r} miles
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Company Direct Emails */}
          <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Direct Emails from Followed Companies</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Receive emails from estate sale companies you've favorited. Each company can email you at most once per week.
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.company_direct_emails}
              onCheckedChange={(v) => setPrefs({ ...prefs, company_direct_emails: v })}
            />
          </div>

          {/* Cool Finds Blog - Weekly Email Digest */}
          <div className="flex items-start justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Cool Finds Weekly Email Digest</div>
                <div className="text-xs text-purple-700 mt-0.5">
                  Get a weekly email every Monday with all the new cool finds stories from across the country.
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.cool_finds_blog_email || false}
              onCheckedChange={(v) => setPrefs({ ...prefs, cool_finds_blog_email: v })}
            />
          </div>

          {/* Cool Finds Blog - In-App Notifications */}
          <div className="flex items-start justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Cool Finds In-App Notifications</div>
                <div className="text-xs text-purple-700 mt-0.5">
                  Get notified in your dashboard whenever a new cool finds story is published.
                </div>
              </div>
            </div>
            <Switch
              checked={prefs.cool_finds_blog_in_app || false}
              onCheckedChange={(v) => setPrefs({ ...prefs, cool_finds_blog_in_app: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location for local matching */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-cyan-600" />
            Your Location for Local Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={prefs.location_city || ''}
                onChange={(e) => setPrefs({ ...prefs, location_city: e.target.value })}
                placeholder="Your city"
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={prefs.location_state || ''}
                onChange={(e) => setPrefs({ ...prefs, location_state: e.target.value })}
                placeholder="Your state"
              />
            </div>
            <div>
              <Label>ZIP Code</Label>
              <Input
                value={prefs.location_zip || ''}
                onChange={(e) => setPrefs({ ...prefs, location_zip: e.target.value })}
                placeholder="12345"
                maxLength="5"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            We use this location to match you with nearby estate sales. Update it anytime you move.
          </p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save Email Preferences'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" /> Saved!
          </span>
        )}
      </div>
    </div>
  );
}