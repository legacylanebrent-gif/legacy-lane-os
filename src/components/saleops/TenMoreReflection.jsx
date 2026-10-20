import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Star } from 'lucide-react';

// Chapter 5 P1 — "Would you want ten more sales like this one?" owner reflection.
// Canonical home: SaleRecap (finds the existing recap by sale_id, creates a minimal
// one if the recap workflow hasn't run yet — generateSaleRecap upserts by sale_id,
// so these fields survive recap generation). The operator owns the judgment;
// AI may analyze the answer later but never overwrites it.

const CHOICES = [
  { value: 'YES', label: 'Yes', tone: 'bg-green-600 hover:bg-green-700' },
  { value: 'MAYBE', label: 'Maybe', tone: 'bg-amber-500 hover:bg-amber-600' },
  { value: 'NO', label: 'No', tone: 'bg-red-600 hover:bg-red-700' },
];

export default function TenMoreReflection({ sale }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recapId, setRecapId] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [why, setWhy] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!sale?.id) { setLoading(false); return; }
      try {
        const existing = await base44.entities.SaleRecap.filter({ sale_id: sale.id });
        if (existing.length > 0) {
          setRecapId(existing[0].id);
          setAnswer(existing[0].would_take_ten_more || null);
          setWhy(existing[0].would_take_ten_more_why || '');
          setSavedAt(existing[0].would_take_ten_more_at || null);
        }
      } catch (e) {
        console.error('Could not load ten-more reflection:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sale?.id]);

  const save = async () => {
    if (!answer) { alert('Choose YES, MAYBE, or NO first.'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fields = { would_take_ten_more: answer, would_take_ten_more_why: why || '', would_take_ten_more_at: now };
      if (recapId) {
        await base44.entities.SaleRecap.update(recapId, fields);
      } else {
        const created = await base44.entities.SaleRecap.create({
          sale_id: sale.id,
          operator_id: sale.operator_id,
          ...fields,
        });
        setRecapId(created.id);
      }
      setSavedAt(now);
    } catch (e) {
      alert('Could not save your reflection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-cyan-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="w-4 h-4 text-orange-500" /> Would you want ten more sales like this one?
        </CardTitle>
        <p className="text-xs text-slate-500">
          A quick owner reflection, not another form. Your answer feeds what EstateSalen learns about your ideal
          sale — it is your judgment, and nothing overwrites it.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              {CHOICES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setAnswer(c.value)}
                  className={`px-5 py-2 rounded-md text-sm font-semibold border transition-colors ${
                    answer === c.value
                      ? `${c.tone} text-white border-transparent`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
              {savedAt && !saving && <Badge variant="outline" className="self-center">Saved</Badge>}
            </div>
            <div>
              <label className="text-xs text-slate-500">Why? (this is the valuable part)</label>
              <textarea
                value={why}
                onChange={e => setWhy(e.target.value)}
                rows={2}
                className="w-full mt-1 rounded-md border border-input bg-white p-2 text-sm"
                placeholder="e.g. Great client, strong merchandise, easy property — or: too much labor, difficult parking, family kept changing scope…"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="bg-orange-600 hover:bg-orange-700 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {answer ? `Save “${answer}”` : 'Save Reflection'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}