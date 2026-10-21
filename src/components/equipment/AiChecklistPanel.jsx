import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { asList } from './equipmentModel';

// Chapter 8 P1 — AI CHECKLIST BUILDER. AI may only SUGGEST preparation tasks
// from VERIFIED sale facts (site assessment, agreed scope, research flags,
// display attention, existing tasks) with an evidence reason. The operator
// reviews; ONLY approved suggestions become existing SaleTask records. AI
// never creates operational commitments silently, never certifies safety,
// security or legal compliance, and never invents client instructions.
export default function AiChecklistPanel({ sale, onTasksAdded }) {
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState('');

  const gatherFacts = async () => {
    const [scopeRes, researchRes, attentionRes, tasksRes] = await Promise.all([
      base44.entities.SaleScope.filter({ sale_id: sale.id, status: 'ACTIVE' }),
      base44.entities.Item.filter({ estate_sale_id: sale.id, research_status: { $ne: 'CLEAR' } }),
      base44.entities.Item.filter({ estate_sale_id: sale.id, display_attention: { $ne: 'NONE' } }),
      base44.entities.SaleTask.filter({ sale_id: sale.id }),
    ]);
    const scope = asList(scopeRes)[0] || null;
    return {
      scope,
      researchItems: asList(researchRes).map(i => ({ id: i.id, title: i.title, status: i.research_status, reason: i.research_reason || '' })),
      attentionItems: asList(attentionRes).map(i => ({ id: i.id, title: i.title, attention: i.display_attention })),
      existingTaskNames: asList(tasksRes).map(t => t.name.toLowerCase()),
    };
  };

  const buildSuggestions = async () => {
    setLoading(true);
    setMsg('');
    setSuggestions(null);
    try {
      const facts = await gatherFacts();
      const sa = sale.site_assessment || {};
      const scopeNames = (facts.scope?.scope_items || []).filter(s => s.included).map(s => s.display_name).join(', ');
      const prompt = `You are suggesting PREPARATION tasks for an estate sale. Use ONLY the verified facts below — do not invent anything.

SALE: "${sale.title}" (type: ${sale.sale_type || 'unspecified'})
SITE ASSESSMENT: property_type=${sa.property_type || 'unknown'}; stairs_levels=${sa.stairs_levels || 'unknown'}; elevator=${sa.elevator || 'unknown'}; parking=${sa.parking || 'unknown'}; loading_access=${sa.loading_access || 'unknown'}; merchandise_volume=${sa.merchandise_volume || 'unknown'}; community_restrictions=${sa.community_restrictions || 'unknown'}; pickup_constraints=${sa.pickup_constraints || 'unknown'}; sale_day_restrictions=${(sa.sale_day_restrictions || '').slice(0, 200) || 'none recorded'}.
AGREED SCOPE (included services): ${scopeNames || 'no scope record on file'}; ${facts.scope?.included_work ? `included work: ${facts.scope.included_work.slice(0, 200)}` : ''}
ITEMS NEEDING RESEARCH (${facts.researchItems.length}): ${facts.researchItems.slice(0, 10).map(i => `"${i.title}" (${i.status})`).join('; ') || 'none'}
ITEMS WITH DISPLAY ATTENTION (${facts.attentionItems.length}): ${facts.attentionItems.slice(0, 10).map(i => `"${i.title}" (${i.attention})`).join('; ') || 'none'}
EXISTING TASKS (do not duplicate): ${facts.existingTaskNames.join('; ') || 'none'}

Rules:
- Suggest at most 8 practical preparation/execution tasks that follow from these facts only.
- Each suggestion must have a "reason" citing the specific fact that prompted it (e.g. "Suggested because site assessment indicates limited parking." or "Suggested because 2 items are marked CONTROLLED DISPLAY."). Never invent facts.
- Do NOT suggest anything that certifies safety, security, or legal compliance, changes the agreed scope, or invents client instructions.
- Category must be one of: Planning, Preparation, Marketing, Execution, Post-Sale.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
      });
      const list = (res?.suggestions || [])
        .filter(s => s.name && !facts.existingTaskNames.includes(String(s.name).toLowerCase()));
      setSuggestions(list);
      setSelected(Object.fromEntries(list.map((_, i) => [i, true])));
      if (list.length === 0) setMsg('No new suggestions — AI found nothing beyond your existing tasks.');
    } catch (e) {
      console.error(e);
      setMsg('Could not generate suggestions.');
    } finally {
      setLoading(false);
    }
  };

  const addSelected = async () => {
    const chosen = (suggestions || []).filter((_, i) => selected[i]);
    if (chosen.length === 0) return;
    setAdding(true);
    try {
      const base = { sale_id: sale.id, operator_id: sale.operator_id, company_id: sale.company_id || '', sale_team_ids: sale.sale_team || [], status: 'not_started', priority: 'medium' };
      await base44.entities.SaleTask.bulkCreate(chosen.map((s, i) => ({
        ...base,
        name: s.name,
        description: `${s.description}${s.reason ? ` (Why: ${s.reason})` : ''}`,
        category: s.category || 'Preparation',
        sort_order: 100 + i,
      })));
      setSuggestions(suggestions.filter((_, i) => !selected[i]));
      setSelected({});
      setMsg(`Added ${chosen.length} task(s) to SaleTasks. Rejected suggestions created nothing.`);
      if (onTasksAdded) onTasksAdded(chosen.length);
    } catch (e) {
      console.error(e);
      setMsg('Could not add the selected tasks.');
    } finally {
      setAdding(false);
    }
  };

  const chosenCount = Object.entries(selected).filter(([, v]) => v).length;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-600" />AI Checklist Builder</CardTitle>
        <Button size="sm" onClick={buildSuggestions} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
          {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Analyzing sale facts...</> : 'Suggest Preparation Tasks'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500 flex items-start gap-1">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Suggestions come from your own records (site assessment, agreed scope, research flags, display attention). You approve — only approved suggestions become SaleTasks. AI never certifies safety, security, or legal compliance.
        </p>
        {msg && <p className="text-sm text-slate-700">{msg}</p>}
        {suggestions && suggestions.length > 0 && (
          <>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <label key={i} className="flex items-start gap-3 p-2.5 border border-slate-200 rounded-lg">
                  <Checkbox checked={!!selected[i]} onCheckedChange={v => setSelected(p => ({ ...p, [i]: !!v }))} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{s.name}</span>
                      <Badge variant="outline">{s.category}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{s.description}</p>
                    {s.reason && <p className="text-xs text-purple-700 mt-0.5">Why: {s.reason}</p>}
                  </div>
                </label>
              ))}
            </div>
            <Button onClick={addSelected} disabled={adding || chosenCount === 0} className="bg-green-600 hover:bg-green-700">
              {adding ? 'Adding...' : `Add ${chosenCount} selected to SaleTasks`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}