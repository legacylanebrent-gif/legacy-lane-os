import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil, Printer, Download, Trash2, Plus, Sparkles } from 'lucide-react';
import { priceRowText } from '@/components/signs/pricingSignModel';

// The sale's own pricing signs — every library pricing sign the operator changed
// for this sale, plus the ones they built. Sits at the top of the signs page so
// the operator prints from here rather than hunting the library again.
export default function CustomSignsSection({ records, onNew, onEdit, onView, onPrint, onDownload, onDelete }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            Custom and Modified Signs ({records.length})
          </h3>
          <p className="text-xs text-slate-600">
            Pricing signs you changed for this sale. They print the items you kept and the prices you set.
          </p>
        </div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={onNew}>
          <Plus className="w-4 h-4 mr-1" />
          New Pricing Sign
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-600 border border-dashed border-amber-300 rounded-lg p-4 bg-white/70">
          No custom signs yet. Open Edit on any pricing sign to drop items and set your own ranges, or create a new one.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {records.map(record => {
            const kept = (record.rows || []).filter(row => row.included !== false);
            return (
              <Card key={record.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{record.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {kept.length} item{kept.length === 1 ? '' : 's'} · 1 page
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={record.source === 'custom'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'}
                  >
                    {record.source === 'custom' ? 'Custom' : 'Modified'}
                  </Badge>
                </div>

                {kept.length > 0 && (
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {kept.slice(0, 3).map(row => `${row.label} ${priceRowText(row)}`.trim()).join(' · ')}
                  </p>
                )}

                <div className="grid grid-cols-5 gap-1">
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-1" onClick={() => onView(record)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-1" onClick={() => onEdit(record)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-1" onClick={() => onPrint(record)}>
                    <Printer className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-1" onClick={() => onDownload(record)}>
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 px-1 text-slate-500 hover:text-red-600"
                    onClick={() => onDelete(record)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}