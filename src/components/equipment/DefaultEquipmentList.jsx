import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Minus, Package, Plus } from 'lucide-react';
import { DEFAULT_EQUIPMENT, DEFAULT_EQUIPMENT_CATEGORIES } from './defaultEquipmentList';

const Stepper = ({ value, onChange, disabled }) => (
  <div className="flex items-center gap-1">
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-7 w-7"
      disabled={disabled || value <= 1}
      onClick={() => onChange(value - 1)}
    >
      <Minus className="w-3 h-3" />
    </Button>
    <span className="w-7 text-center text-sm font-semibold text-slate-800">{value}</span>
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-7 w-7"
      disabled={disabled}
      onClick={() => onChange(value + 1)}
    >
      <Plus className="w-3 h-3" />
    </Button>
  </div>
);

// The built-in every-sale equipment list: set a quantity and add it to this
// sale's list in one tap, so the same equipment never has to be retyped.
export default function DefaultEquipmentList({ assignments, busy, onAddItems, onSetQuantity }) {
  const [qtyByKey, setQtyByKey] = useState(() =>
    Object.fromEntries(DEFAULT_EQUIPMENT.map(d => [d.key, d.qty]))
  );

  const addedByName = useMemo(() => {
    const map = {};
    (assignments || []).forEach(a => {
      map[(a.name || '').trim().toLowerCase()] = a;
    });
    return map;
  }, [assignments]);

  const remaining = DEFAULT_EQUIPMENT.filter(d => !addedByName[d.name.toLowerCase()]);

  const addOne = (item) => {
    onAddItems([{
      name: item.name,
      category: item.category,
      entry_type: item.entry_type,
      quantity: qtyByKey[item.key] || 1,
    }]);
  };

  const addAllRemaining = () => {
    onAddItems(remaining.map(item => ({
      name: item.name,
      category: item.category,
      entry_type: item.entry_type,
      quantity: qtyByKey[item.key] || 1,
    })));
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4 text-orange-600" />Every-Sale Equipment
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            The kit every sale needs. Set the quantity and add it — no retyping.
          </p>
        </div>
        <Button
          onClick={addAllRemaining}
          disabled={busy || remaining.length === 0}
          className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
        >
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          {remaining.length === 0 ? 'All added' : `Add all ${remaining.length} remaining`}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {DEFAULT_EQUIPMENT_CATEGORIES.map(category => {
          const items = DEFAULT_EQUIPMENT.filter(d => d.category === category);
          return (
            <div key={category} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</p>
              {items.map(item => {
                const added = addedByName[item.name.toLowerCase()];
                const value = added ? (added.quantity || 1) : (qtyByKey[item.key] || 1);
                return (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className={`flex-1 min-w-[130px] text-sm ${added ? 'text-slate-500' : 'text-slate-800'}`}>
                      {item.name}
                    </span>
                    <Stepper
                      value={value}
                      disabled={busy}
                      onChange={n => {
                        if (added) onSetQuantity(added.id, n);
                        else setQtyByKey(prev => ({ ...prev, [item.key]: n }));
                      }}
                    />
                    {added ? (
                      <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                        <Check className="w-3 h-3 mr-1" />Added
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => addOne(item)}>
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}