import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const DEFAULT_SETTINGS = {
  preferred_growth_goal: 'Grow Legacy Lane OS recurring subscription revenue',
  monthly_revenue_target: 25000,
  target_operator_count: 25,
  target_territories: [],
  default_market: 'New Jersey',
  referral_program_enabled: true,
  conservative_compliance_mode: true,
  default_execution_style: 'Practical, direct, revenue-focused, step-by-step',
};

export default function AdminAISettingsPanel({ user }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recordId, setRecordId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [territoriesInput, setTerritoriesInput] = useState('');

  useEffect(() => {
    if (open) loadSettings();
  }, [open]);

  const loadSettings = async () => {
    try {
      const list = await base44.entities.AdminAISettings.list('-created_date', 1);
      if (list.length > 0) {
        const s = list[0];
        setSettings({ ...DEFAULT_SETTINGS, ...s });
        setRecordId(s.id);
        setTerritoriesInput((s.target_territories || []).join(', '));
      }
    } catch (_) {}
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const territories = territoriesInput
      .split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      ...settings,
      target_territories: territories,
      updated_by: user?.email || '',
      updated_at: now,
    };
    try {
      if (recordId) {
        await base44.entities.AdminAISettings.update(recordId, payload);
      } else {
        const created = await base44.entities.AdminAISettings.create({
          ...payload,
          created_by: user?.email || '',
          created_at: now,
        });
        setRecordId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-300">Advanced Admin Settings</span>
          <span className="text-xs text-slate-500">— configure AI behavior, targets & compliance</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-700/40 pt-4 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Growth Goal */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Preferred Growth Goal</label>
              <Input
                value={settings.preferred_growth_goal}
                onChange={e => set('preferred_growth_goal', e.target.value)}
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Revenue Target */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Monthly Revenue Target ($)</label>
              <Input
                type="number"
                value={settings.monthly_revenue_target}
                onChange={e => set('monthly_revenue_target', parseFloat(e.target.value) || 0)}
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Operator Count */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Target Operator Count</label>
              <Input
                type="number"
                value={settings.target_operator_count}
                onChange={e => set('target_operator_count', parseInt(e.target.value) || 0)}
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Default Market */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Default Market</label>
              <Input
                value={settings.default_market}
                onChange={e => set('default_market', e.target.value)}
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Target Territories */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Target Territories (comma separated)</label>
              <Input
                value={territoriesInput}
                onChange={e => setTerritoriesInput(e.target.value)}
                placeholder="e.g. Essex County NJ, Bergen County NJ"
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>

            {/* Execution Style */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 uppercase tracking-widest block mb-1.5">Default Execution Style</label>
              <Input
                value={settings.default_execution_style}
                onChange={e => set('default_execution_style', e.target.value)}
                className="bg-slate-800/60 border-slate-600 text-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => set('referral_program_enabled', !settings.referral_program_enabled)}
              className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full border font-medium transition-all ${
                settings.referral_program_enabled
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-slate-700/40 text-slate-500 border-slate-600'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${settings.referral_program_enabled ? 'bg-green-400' : 'bg-slate-500'}`} />
              Referral Program {settings.referral_program_enabled ? 'Enabled' : 'Disabled'}
            </button>

            <button
              onClick={() => set('conservative_compliance_mode', !settings.conservative_compliance_mode)}
              className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full border font-medium transition-all ${
                settings.conservative_compliance_mode
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-700/40 text-slate-500 border-slate-600'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${settings.conservative_compliance_mode ? 'bg-amber-400' : 'bg-slate-500'}`} />
              Conservative Compliance {settings.conservative_compliance_mode ? 'ON' : 'OFF'}
            </button>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving...</> :
             saved  ? '✓ Settings Saved' :
                      <><Save className="w-3.5 h-3.5 mr-1.5" />Save Settings</>}
          </Button>
        </div>
      )}
    </div>
  );
}