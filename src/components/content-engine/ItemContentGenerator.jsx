import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';

const POPULAR_ITEMS = [
  'Pyrex Butterprint Mixing Bowl','Hummel Figurines','Depression Glass','Limoges Porcelain',
  'McCoy Pottery','Roseville Pottery','Fiesta Ware','Hull Pottery','Lenox China',
  'Sterling Silver Flatware','Gorham Silver','Tiffany Lamp','Stained Glass Panel',
  'Vintage Jewelry Box','Costume Jewelry Lot','Mid Century Modern Chair',
  'Eames Lounge Chair','Heywood Wakefield Furniture','Cast Iron Skillet Set',
  'Vintage Sewing Machine','Singer Featherweight Sewing Machine',
];

export default function ItemContentGenerator({ items, onRefresh }) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkList, setBulkList] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [results, setResults] = useState([]);

  const handleSingle = async () => {
    if (!itemName) return;
    setLoading(true);
    const res = await base44.functions.invoke('generateItemGuide', { item_name: itemName, category });
    setResults(p => [{ item: itemName, ...res.data }, ...p]);
    setLoading(false);
    onRefresh();
  };

  const addPopular = (item) => {
    if (!bulkList.includes(item)) setBulkList(p => [...p, item]);
  };

  const handleBulk = async () => {
    setBulkRunning(true);
    setResults([]);
    for (const item of bulkList) {
      const res = await base44.functions.invoke('generateItemGuide', { item_name: item });
      setResults(p => [...p, { item, ...res.data }]);
    }
    setBulkRunning(false);
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-3">Single Item Guide</p>
        <div className="flex gap-2">
          <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Pyrex Butterprint Mixing Bowl" className="h-9" />
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (optional)" className="h-9 w-40" />
          <Button onClick={handleSingle} disabled={loading || !itemName} size="sm" className="h-9 shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" />Generate</>}
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-600 mb-2">Bulk Generate — Popular Items</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {POPULAR_ITEMS.map(item => (
            <button key={item} onClick={() => addPopular(item)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${bulkList.includes(item) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {item}
            </button>
          ))}
        </div>
        {bulkList.length > 0 && (
          <div className="mb-3 space-y-1 max-h-32 overflow-y-auto">
            {bulkList.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                <span>{item}</span>
                <button onClick={() => setBulkList(p => p.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-slate-400" /></button>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleBulk} disabled={bulkRunning || !bulkList.length} className="bg-slate-800 hover:bg-slate-900 text-white text-sm gap-2">
          {bulkRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate {bulkList.length} Item Guides</>}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 border-t pt-4">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.success || r.id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span className="font-medium text-slate-700">{r.item}</span>
              {r.seo_title && <span className="text-slate-400 truncate">{r.seo_title}</span>}
              {r.error && <span className="text-red-500">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}