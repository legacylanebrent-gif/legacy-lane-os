import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { ENTRY_TYPE_LABELS, PACKOUT_STATES, PACKOUT_LABELS } from './equipmentModel';

const PACKOUT_STYLES = {
  RETURNED: 'bg-green-100 text-green-700 border-green-400',
  DAMAGED: 'bg-orange-100 text-orange-700 border-orange-400',
  MISSING: 'bg-red-100 text-red-700 border-red-400',
  LEFT_INTENTIONALLY: 'bg-slate-200 text-slate-700 border-slate-400',
};

// Chapter 8 P1 — ONE sale equipment assignment row: expected -> loaded (packed)
// -> terminal ending (pack-out). The same record serves both directions.
export default function AssignmentCard({ a, assetName, onPatch, onDelete, onRestockTask }) {
  const reusable = a.entry_type === 'REUSABLE_EQUIPMENT';
  const consumable = a.entry_type === 'CONSUMABLE';
  const unresolved = a.packed && a.packout_state === 'PENDING';
  const quantity = a.quantity || 1;

  return (
    <div className={`p-3 border rounded-lg space-y-2 ${a.packed ? 'border-green-200 bg-green-50/40' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={!!a.packed}
          onCheckedChange={() => onPatch(a.id, { packed: !a.packed })}
          className="mt-1 h-5 w-5"
          aria-label={`Loaded and delivered: ${a.name}`}
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900 text-sm break-words">{a.name}</span>
            <Badge variant="secondary" className="text-xs">×{quantity}</Badge>
            {assetName && <span className="text-xs text-slate-500">— {assetName}</span>}
            <Badge variant="outline" className="text-xs">{a.category || 'OTHER'}</Badge>
            <Badge variant={reusable ? 'default' : 'secondary'} className="text-xs">{ENTRY_TYPE_LABELS[a.entry_type] || a.entry_type}</Badge>
            {a.source === 'sale_specific' && <Badge className="bg-purple-100 text-purple-700 text-xs">Sale-specific</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <Package className="w-3 h-3" />
              <span className={a.packed ? 'text-green-700 font-medium' : ''}>
                {a.packed ? 'Loaded & delivered to site' : 'Not loaded yet'}
              </span>
            </label>
            <Button size="sm" variant="ghost" className="text-red-600 h-7 ml-auto" onClick={() => onDelete(a.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Load-out: consumable sufficiency */}
      {a.packed && consumable && (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <span className="text-xs text-slate-500">Supply state:</span>
          <Button size="sm" variant={a.restock_needed ? 'outline' : 'default'}
            className={a.restock_needed ? '' : 'bg-green-600 hover:bg-green-700'}
            onClick={() => onPatch(a.id, { restock_needed: !a.restock_needed })}>
            {a.restock_needed ? 'Restock needed' : 'Enough'}
          </Button>
          {a.restock_needed && (
            <Button size="sm" variant="outline" onClick={() => onRestockTask(a)}>
              <RotateCcw className="w-3 h-3 mr-1" />Create restock task
            </Button>
          )}
        </div>
      )}

      {/* Pack-out: every reusable asset that left gets an ending */}
      {a.packed && reusable && (
        <div className="flex flex-wrap items-center gap-2 pl-8">
          <span className="text-xs text-slate-500">Pack-out:</span>
          {PACKOUT_STATES.filter(s => s !== 'PENDING').map(s => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className={a.packout_state === s ? PACKOUT_STYLES[s] : ''}
              disabled={a.packout_state === s}
              onClick={() => onPatch(a.id, { packout_state: s })}
            >
              {PACKOUT_LABELS[s]}
            </Button>
          ))}
          {a.packout_state === 'MISSING' && (
            <span className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Asset stays AT_SALE until you resolve it</span>
          )}
          {a.packout_state === 'LEFT_INTENTIONALLY' && (
            <span className="text-xs text-slate-500">Linked asset is retired from company stock</span>
          )}
        </div>
      )}

      {unresolved && (
        <p className="text-xs text-amber-700 pl-8 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />Went to the sale, no ending recorded yet{reusable ? '' : ' (consumable — mark state or ignore)'}
        </p>
      )}
    </div>
  );
}