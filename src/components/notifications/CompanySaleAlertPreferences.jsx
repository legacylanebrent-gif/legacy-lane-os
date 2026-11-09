import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Zap, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${h === 0 ? 12 : h > 12 ? h - 12 : h}:00 ${h < 12 ? 'AM' : 'PM'}`
}));

// Customer-side choices for new sale alerts. Company alerts are on-site only; a customer who
// turns instant off still sees the company's sales in the daily roundup.
export default function CompanySaleAlertPreferences({ pref, onSave }) {
  const [form, setForm] = useState({
    company_sale_alerts_instant: pref?.company_sale_alerts_instant ?? true,
    daily_sale_roundup: pref?.daily_sale_roundup ?? true,
    roundup_hour: String(pref?.roundup_hour ?? 9)
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...form, roundup_hour: Number(form.roundup_hour) });
      toast.success('Sale alert preferences saved');
    } catch {
      toast.error('Could not save sale alert preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-cyan-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-5 h-5 text-cyan-600" />
          Company New Sale Alerts
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Alerts arrive as on-site notifications in EstateSalen — never by email.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-slate-800">Alert me instantly</div>
              <div className="text-xs text-slate-500">
                The moment a company you follow publishes a sale. Turn this off and their new sales
                reach you only in the daily roundup below.
              </div>
            </div>
          </div>
          <Switch
            checked={form.company_sale_alerts_instant}
            onCheckedChange={(v) => setForm({ ...form, company_sale_alerts_instant: v })}
          />
        </div>

        <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-cyan-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm text-slate-800">EstateSalen daily roundup</div>
              <div className="text-xs text-slate-500">
                One on-site notification a day with the newest estate sales across the whole platform.
              </div>
            </div>
          </div>
          <Switch
            checked={form.daily_sale_roundup}
            onCheckedChange={(v) => setForm({ ...form, daily_sale_roundup: v })}
          />
        </div>

        {form.daily_sale_roundup && (
          <div className="flex flex-wrap items-center gap-3 pl-4">
            <Label className="text-sm text-slate-700">Deliver my roundup at</Label>
            <Select
              value={form.roundup_hour}
              onValueChange={(v) => setForm({ ...form, roundup_hour: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-slate-500">Eastern Time</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Alert Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}