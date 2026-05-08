import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Bell, Mail, MapPin, Tag, Clock, Building2, Save, CheckCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const ESTATE_SALE_CATEGORIES = [
  'Furniture', 'Antiques', 'Art', 'Jewelry', 'Clothing', 'Books',
  'Collectibles', 'Electronics', 'Kitchen', 'Tools', 'Sports',
  'Toys', 'Coins', 'Silver', 'Gold', 'Vintage', 'China', 'Linens',
  'Rugs', 'Lighting', 'Musical Instruments', 'Vehicles'
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 35, 50, 75, 100];
const NOTICE_OPTIONS = [
  { value: 0, label: 'Any time' },
  { value: 1, label: 'At least 1 day away' },
  { value: 3, label: 'At least 3 days away' },
  { value: 7, label: 'At least 1 week away' },
  { value: 14, label: 'At least 2 weeks away' },
];

export default function SaleAlertSettings({ pref, onSave }) {
  const [form, setForm] = useState({
    sale_alert_enabled: pref?.sale_alert_enabled ?? false,
    sale_alert_email: pref?.sale_alert_email ?? true,
    sale_alert_inapp: pref?.sale_alert_inapp ?? true,
    sale_alert_radius_miles: pref?.sale_alert_radius_miles ?? 25,
    sale_alert_zip: pref?.sale_alert_zip ?? '',
    sale_alert_categories: pref?.sale_alert_categories ?? [],
    sale_alert_frequency: pref?.sale_alert_frequency ?? 'instant',
    sale_alert_followed_only: pref?.sale_alert_followed_only ?? false,
    sale_alert_min_days_notice: pref?.sale_alert_min_days_notice ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [zipError, setZipError] = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      sale_alert_categories: prev.sale_alert_categories.includes(cat)
        ? prev.sale_alert_categories.filter(c => c !== cat)
        : [...prev.sale_alert_categories, cat]
    }));
  };

  const validateZip = (zip) => {
    if (!zip) return true; // optional
    return /^\d{5}$/.test(zip.trim());
  };

  const handleSave = async () => {
    if (form.sale_alert_zip && !validateZip(form.sale_alert_zip)) {
      setZipError('Enter a valid 5-digit ZIP code');
      return;
    }
    setZipError('');
    setSaving(true);
    try {
      // Clear cached geo coords if zip changed
      const updates = { ...form };
      if (form.sale_alert_zip !== pref?.sale_alert_zip) {
        updates.sale_alert_lat = null;
        updates.sale_alert_lng = null;
      }
      await onSave(updates);
      toast.success('Sale alert settings saved!');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-orange-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-orange-500" />
            New Sale Alerts
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-slate-500">
              {form.sale_alert_enabled ? 'Active' : 'Off'}
            </span>
            <Switch
              checked={form.sale_alert_enabled}
              onCheckedChange={(v) => set('sale_alert_enabled', v)}
            />
          </div>
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Get notified whenever a new estate sale matching your preferences is posted.
        </p>
      </CardHeader>

      <CardContent className={`space-y-6 ${!form.sale_alert_enabled ? 'opacity-50 pointer-events-none' : ''}`}>

        {/* Delivery channels */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-3 block">Delivery Channels</Label>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-xs text-slate-400">Sent to your account email</p>
                </div>
              </div>
              <Switch checked={form.sale_alert_email} onCheckedChange={v => set('sale_alert_email', v)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-500" />
                <div>
                  <p className="text-sm font-medium">In-App</p>
                  <p className="text-xs text-slate-400">Dashboard notification bell</p>
                </div>
              </div>
              <Switch checked={form.sale_alert_inapp} onCheckedChange={v => set('sale_alert_inapp', v)} />
            </div>
          </div>
        </div>

        {/* Frequency */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Alert Frequency
          </Label>
          <Select value={form.sale_alert_frequency} onValueChange={v => set('sale_alert_frequency', v)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant — as soon as a sale is posted</SelectItem>
              <SelectItem value="daily_digest">Daily digest — once per day</SelectItem>
              <SelectItem value="weekly_digest">Weekly digest — once per week</SelectItem>
            </SelectContent>
          </Select>
          {form.sale_alert_frequency !== 'instant' && (
            <p className="text-xs text-amber-600 mt-1.5">
              ⚠️ Digest emails are sent on a schedule. Instant alerts fire immediately when a sale is posted.
            </p>
          )}
        </div>

        {/* Location / Radius */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> Location & Radius
          </Label>
          <div className="grid sm:grid-cols-2 gap-4 items-start">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Center ZIP Code</Label>
              <Input
                placeholder="e.g. 07030"
                maxLength={5}
                value={form.sale_alert_zip}
                onChange={e => {
                  set('sale_alert_zip', e.target.value);
                  setZipError('');
                }}
                className={zipError ? 'border-red-400' : ''}
              />
              {zipError && <p className="text-xs text-red-500 mt-1">{zipError}</p>}
              <p className="text-xs text-slate-400 mt-1">Leave blank to use any location</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">
                Search Radius: <strong className="text-orange-600">{form.sale_alert_radius_miles} miles</strong>
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => set('sale_alert_radius_miles', r)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      form.sale_alert_radius_miles === r
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-slate-200 text-slate-600 hover:border-orange-300'
                    }`}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-1 block flex items-center gap-1.5">
            <Tag className="w-4 h-4" /> Item Categories
          </Label>
          <p className="text-xs text-slate-400 mb-2">
            Select categories you're interested in. Leave all unselected to match any sale.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ESTATE_SALE_CATEGORIES.map(cat => {
              const selected = form.sale_alert_categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                    selected
                      ? 'bg-orange-100 text-orange-700 border-orange-300'
                      : 'border-slate-200 text-slate-500 hover:border-orange-200 hover:text-slate-700'
                  }`}
                >
                  {selected && <CheckCircle className="w-2.5 h-2.5" />}
                  {cat}
                </button>
              );
            })}
          </div>
          {form.sale_alert_categories.length > 0 && (
            <button
              onClick={() => set('sale_alert_categories', [])}
              className="text-xs text-slate-400 hover:text-slate-600 mt-2 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear all categories
            </button>
          )}
        </div>

        {/* Filters */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-3 block">Filters</Label>
          <div className="space-y-3">
            {/* Followed only */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-sm font-medium">Followed companies only</p>
                  <p className="text-xs text-slate-400">Only alert for sales from companies you follow</p>
                </div>
              </div>
              <Switch
                checked={form.sale_alert_followed_only}
                onCheckedChange={v => set('sale_alert_followed_only', v)}
              />
            </div>

            {/* Advance notice */}
            <div className="p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <p className="text-sm font-medium">Advance notice filter</p>
              </div>
              <Select
                value={String(form.sale_alert_min_days_notice)}
                onValueChange={v => set('sale_alert_min_days_notice', Number(v))}
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1.5">Skip alerts for sales starting very soon</p>
            </div>
          </div>
        </div>

        {/* Summary preview */}
        {form.sale_alert_enabled && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
            <p className="font-semibold mb-1">Your alert summary:</p>
            <ul className="space-y-0.5 text-xs text-orange-700 list-disc ml-4">
              <li>
                Channels: {[form.sale_alert_email && 'Email', form.sale_alert_inapp && 'In-App'].filter(Boolean).join(', ') || 'None selected'}
              </li>
              <li>
                Frequency: {form.sale_alert_frequency === 'instant' ? 'Instant' : form.sale_alert_frequency === 'daily_digest' ? 'Daily digest' : 'Weekly digest'}
              </li>
              <li>
                Radius: {form.sale_alert_zip ? `${form.sale_alert_radius_miles} miles from ${form.sale_alert_zip}` : 'Any location'}
              </li>
              <li>
                Categories: {form.sale_alert_categories.length > 0 ? form.sale_alert_categories.join(', ') : 'All categories'}
              </li>
              {form.sale_alert_followed_only && <li>Only from companies you follow</li>}
              {form.sale_alert_min_days_notice > 0 && <li>Sales at least {form.sale_alert_min_days_notice} day{form.sale_alert_min_days_notice !== 1 ? 's' : ''} away</li>}
            </ul>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Alert Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}