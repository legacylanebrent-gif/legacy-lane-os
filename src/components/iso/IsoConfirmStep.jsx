import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Repeat, Target, X, AlertTriangle } from 'lucide-react';

/** Final step: intent, budget, area and how exact the search should be. */
export default function IsoConfirmStep({ draft, setDraft, suggestion, onSave, saving, error, duplicate, onSaveAnyway }) {
  const [exclusion, setExclusion] = useState('');
  const patch = (changes) => setDraft({ ...draft, ...changes });
  const suggested = suggestion?.suggestion || 'ongoing';

  const addExclusion = () => {
    const value = exclusion.trim();
    if (!value) return;
    patch({ exclusions: [...(draft.exclusions || []), value] });
    setExclusion('');
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="iso-confirm-title" className="text-xs">Name this search</Label>
        <Input
          id="iso-confirm-title"
          value={draft.title || ''}
          onChange={e => patch({ title: e.target.value })}
          placeholder="e.g. Walnut credenza"
        />
      </div>

      <div>
        <Label className="text-xs">Is this a one-time search or ongoing?</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => patch({ intent: 'one_time', intent_confirmed: true })}
            className={`rounded-xl border-2 p-2 text-left ${draft.intent === 'one_time' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}
          >
            <Target className="w-4 h-4 text-cyan-700 mb-1" />
            <div className="text-xs font-semibold text-slate-900">One-time</div>
            <div className="text-[11px] text-slate-500">Stop after I find it</div>
          </button>
          <button
            type="button"
            onClick={() => patch({ intent: 'ongoing', intent_confirmed: true })}
            className={`rounded-xl border-2 p-2 text-left ${draft.intent === 'ongoing' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}
          >
            <Repeat className="w-4 h-4 text-cyan-700 mb-1" />
            <div className="text-xs font-semibold text-slate-900">Ongoing</div>
            <div className="text-[11px] text-slate-500">Keep finding these</div>
          </button>
        </div>
        {suggestion?.reason && draft.intent === suggested && (
          <p className="mt-1 text-[11px] text-slate-500">Suggestion only — you decide. ({suggestion.reason})</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="iso-budget-min" className="text-xs">Budget from ($)</Label>
          <Input id="iso-budget-min" type="number" value={draft.budget_min ?? ''} onChange={e => patch({ budget_min: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <Label htmlFor="iso-budget-max" className="text-xs">Budget up to ($)</Label>
          <Input id="iso-budget-max" type="number" value={draft.budget_max ?? ''} onChange={e => patch({ budget_max: e.target.value ? Number(e.target.value) : null })} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <Label htmlFor="iso-zip" className="text-xs">ZIP code</Label>
          <Input id="iso-zip" value={draft.zip_code || ''} onChange={e => patch({ zip_code: e.target.value })} placeholder="08753" />
        </div>
        <div>
          <Label htmlFor="iso-state" className="text-xs">State</Label>
          <Input id="iso-state" value={draft.state || ''} onChange={e => patch({ state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="NJ" />
        </div>
      </div>

      <div>
        <Label className="text-xs">How close a match do you want?</Label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            type="button"
            onClick={() => patch({ match_mode: 'exact' })}
            className={`rounded-xl border-2 p-2 text-left ${draft.match_mode === 'exact' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}
          >
            <div className="text-xs font-semibold text-slate-900">This exact item</div>
            <div className="text-[11px] text-slate-500">Only this item or model</div>
          </button>
          <button
            type="button"
            onClick={() => patch({ match_mode: 'similar' })}
            className={`rounded-xl border-2 p-2 text-left ${draft.match_mode === 'similar' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}
          >
            <div className="text-xs font-semibold text-slate-900">Similar is fine</div>
            <div className="text-[11px] text-slate-500">Same look or style works</div>
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="iso-exclusion" className="text-xs">Anything to leave out?</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="iso-exclusion"
            value={exclusion}
            onChange={e => setExclusion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExclusion(); } }}
            placeholder="e.g. reproductions, particle board"
          />
          <Button type="button" variant="outline" onClick={addExclusion}>Add</Button>
        </div>
        {(draft.exclusions || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {draft.exclusions.map(x => (
              <Badge key={x} variant="outline" className="text-xs gap-1">
                {x}
                <button type="button" onClick={() => patch({ exclusions: draft.exclusions.filter(v => v !== x) })}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-700">I can pick up locally</span>
          <Switch checked={draft.pickup_ok !== false} onCheckedChange={v => patch({ pickup_ok: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-700">Shipping is fine</span>
          <Switch checked={draft.shipping_ok !== false} onCheckedChange={v => patch({ shipping_ok: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-700">Dealers may contact me about this</span>
          <Switch checked={draft.allow_dealer_contact === true} onCheckedChange={v => patch({ allow_dealer_contact: v })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-700">List it publicly on the wanted board</span>
          <Switch checked={draft.public_visibility === true} onCheckedChange={v => patch({ public_visibility: v })} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {duplicate ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-sm text-amber-900 flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {duplicate.message}
          </p>
          <Button variant="outline" onClick={onSaveAnyway} disabled={saving} className="w-full">
            Save another one anyway
          </Button>
        </div>
      ) : (
        <Button
          onClick={onSave}
          disabled={saving || !draft.title || !draft.intent_confirmed}
          className="w-full bg-cyan-700 hover:bg-cyan-800 gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save my search
        </Button>
      )}
      {!draft.intent_confirmed && !duplicate && (
        <p className="text-[11px] text-slate-500 text-center">Choose one-time or ongoing to finish.</p>
      )}
    </div>
  );
}