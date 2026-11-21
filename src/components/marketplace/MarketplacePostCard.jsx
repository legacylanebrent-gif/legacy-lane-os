import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CopyField from '@/components/marketplace/CopyField';

const CONDITIONS = ['New', 'Used Like New', 'Used Good', 'Used Fair'];

const money = (value) => (typeof value === 'number' && Number.isFinite(value) ? `$${value}` : '');

// One item's ready to post Marketplace listing: every field is editable and
// copies on its own, so the operator pastes title, price, description,
// category and condition straight into Facebook.
export default function MarketplacePostCard({ draft, onChange, onPersist }) {
  const set = (patch) => onChange?.(patch);
  const tags = Array.isArray(draft.fb_tags) ? draft.fb_tags.join(', ') : '';

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start gap-3">
        <img
          src={draft.thumbnail_url || draft.photo_url}
          alt={draft.item_name || 'Sale item'}
          className="w-16 h-16 rounded object-cover flex-shrink-0 border border-slate-200"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900 truncate">{draft.item_name || 'Untitled item'}</p>
          <p className="text-xs text-slate-500">
            {money(draft.source_price) ? `Sale price ${money(draft.source_price)}` : 'No price saved on this item'}
            {draft.status === 'copied' ? ' · Copied' : ''}
          </p>
        </div>
        {draft.fb_category && (
          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 flex-shrink-0">
            {draft.fb_category}
          </Badge>
        )}
      </div>

      <CopyField
        label="Title"
        value={draft.fb_title}
        onChange={(value) => set({ fb_title: value })}
        onBlur={() => onPersist?.()}
        placeholder="Marketplace title"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <CopyField
          label="Price"
          type="number"
          value={draft.fb_price ?? ''}
          onChange={(value) => set({ fb_price: value === '' ? null : Number(value) })}
          onBlur={() => onPersist?.()}
          placeholder="0"
        />
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Condition</p>
          <Select
            value={draft.fb_condition || ''}
            onValueChange={(value) => {
              set({ fb_condition: value });
              setTimeout(() => onPersist?.(), 0);
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pick a condition" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map(condition => (
                <SelectItem key={condition} value={condition}>{condition}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CopyField
        label="Description"
        multiline
        rows={5}
        value={draft.fb_description}
        onChange={(value) => set({ fb_description: value })}
        onBlur={() => onPersist?.()}
        placeholder="Marketplace description"
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <CopyField
          label="Category"
          value={draft.fb_category}
          onChange={(value) => set({ fb_category: value })}
          onBlur={() => onPersist?.()}
          placeholder="Furniture, Tools, Home Decor..."
        />
        <CopyField
          label="Tags"
          value={tags}
          onChange={(value) => set({ fb_tags: value.split(',').map(t => t.trim()).filter(Boolean) })}
          onBlur={() => onPersist?.()}
          placeholder="comma separated"
        />
      </div>
    </Card>
  );
}