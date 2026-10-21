import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus } from 'lucide-react';
import { CHECKLIST_TEMPLATES } from '@/components/equipment/checklistTemplates';

// Chapter 8 P2 — Security Walkthrough / Checkout Setup review section.
// Reuses the certified SaleTask system: the checklist template creates ordinary
// SaleTasks and reviewing them means CHECKLIST REVIEWED. Never a safety,
// security, ADA, fire-code or compliance certification.
export default function PrepChecklistSection({ sale, templateKey, checklist, onChanged, tone }) {
  const [busy, setBusy] = useState(false);
  const tpl = CHECKLIST_TEMPLATES[templateKey];
  const { state, total, completed } = checklist;

  const addChecklist = async () => {
    setBusy(true);
    try {
      const existing = await base44.entities.SaleTask.filter({ sale_id: sale.id });
      const names = new Set((Array.isArray(existing) ? existing : existing.items || []).map(t => t.name.toLowerCase()));
      const additions = tpl.tasks
        .filter(t => !names.has(t.name.toLowerCase()))
        .map((t, i) => ({
          sale_id: sale.id, operator_id: sale.operator_id, company_id: sale.company_id || '',
          sale_team_ids: sale.sale_team || [], name: t.name, description: t.description,
          category: t.category, status: 'not_started', priority: 'medium', sort_order: 300 + i,
        }));
      if (additions.length > 0) await base44.entities.SaleTask.bulkCreate(additions);
      if (onChanged) onChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task) => {
    const next = task.status === 'completed' ? 'not_started' : 'completed';
    try {
      await base44.entities.SaleTask.update(task.id, { status: next });
      if (onChanged) onChanged();
    } catch (e) { console.error(e); }
  };

  const badge = state === 'done'
    ? <Badge className="bg-emerald-600">Reviewed ({completed}/{total})</Badge>
    : state === 'open'
    ? <Badge className="bg-amber-600">{completed}/{total} reviewed</Badge>
    : <Badge className="bg-slate-500">Not reviewed</Badge>;

  return (
    <Card id={templateKey === 'SECURITY_WALKTHROUGH' ? 'security' : 'checkout'} className="scroll-mt-24">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className={tone || 'text-slate-800'}>{tpl.label}</CardTitle>
          {badge}
        </div>
        {state === 'none' && (
          <Button size="sm" onClick={addChecklist} disabled={busy} className="bg-slate-800 hover:bg-slate-900">
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}Add checklist
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {state === 'none' ? (
          <p className="text-sm text-slate-600">
            No {tpl.label.toLowerCase()} checklist on this sale yet — this is UNKNOWN, not a failure. Add the checklist,
            review each point, then the area turns READY (reviewed). Private operational information — never shown publicly.
          </p>
        ) : (
          <>
            {checklist.items.map(t => (
              <label key={t.id} className="flex items-start gap-3 p-2 border border-slate-200 rounded-lg">
                <Checkbox checked={t.status === 'completed'} onCheckedChange={() => toggleTask(t)} className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{t.name.replace(/^(Security|Checkout Setup):\s*/, '')}</p>
                  <p className="text-xs text-slate-600">{t.description}</p>
                </div>
              </label>
            ))}
            <p className="text-xs text-slate-500 pt-1">
              Completion means {tpl.label.toUpperCase()} REVIEWED — never SAFE, SECURE, COMPLIANT, ADA COMPLIANT or FIRE-CODE COMPLIANT.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}