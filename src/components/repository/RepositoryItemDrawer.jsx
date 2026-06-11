import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle, AlertCircle, XCircle, Eye, RefreshCw, GitMerge, Image, DollarSign, Barcode, TrendingUp, Edit2, Save } from 'lucide-react';

const STATUS_COLORS = {
  private: 'bg-slate-100 text-slate-700',
  review_needed: 'bg-amber-100 text-amber-700',
  approved_public: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function RepositoryItemDrawer({ item, onClose, onUpdate }) {
  const [imageRefs, setImageRefs] = useState([]);
  const [barcodes, setBarcodes] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [demandMetrics, setDemandMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    canonical_name: item.canonical_name || '',
    brand: item.brand || '',
    category: item.category || '',
    subcategory: item.subcategory || '',
    public_status: item.public_status || 'private',
  });

  useEffect(() => { loadRelated(); }, [item.id]);

  const loadRelated = async () => {
    setLoading(true);
    await Promise.all([
      base44.entities.ItemImageReference.filter({ item_knowledge_id: item.id }).then(setImageRefs).catch(() => setImageRefs([])),
      base44.entities.ItemBarcode.filter({ item_knowledge_id: item.id }).then(setBarcodes).catch(() => setBarcodes([])),
      base44.entities.ItemPriceHistory.filter({ item_knowledge_id: item.id }).then(d => setPriceHistory(d.slice(0, 20))).catch(() => setPriceHistory([])),
      base44.entities.DemandMetrics.filter({ item_knowledge_id: item.id }).then(d => setDemandMetrics(d[0] || null)).catch(() => setDemandMetrics(null)),
    ]);
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await base44.entities.ItemKnowledge.update(item.id, { public_status: newStatus });
      onUpdate();
    } catch {}
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.ItemKnowledge.update(item.id, {
        canonical_name: editForm.canonical_name,
        brand: editForm.brand,
        category: editForm.category,
        subcategory: editForm.subcategory,
        public_status: editForm.public_status,
      });
      setEditing(false);
      onUpdate();
    } catch {}
    setSaving(false);
  };

  const handleRerunMatching = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('itemMatchingService', {
        canonical_name: item.canonical_name,
        normalized_name: item.normalized_name,
        brand: item.brand,
        category: item.category,
        source_type: 'admin',
      });
    } catch {}
    setSaving(false);
  };

  const handleMarkPrimaryImage = async (imgId) => {
    setSaving(true);
    try {
      // Unset all others
      for (const img of imageRefs) {
        if (img.is_primary_image && img.id !== imgId) {
          await base44.entities.ItemImageReference.update(img.id, { is_primary_image: false });
        }
      }
      await base44.entities.ItemImageReference.update(imgId, { is_primary_image: true, is_public_approved: true, retention_status: 'keep_compressed' });
      // Update ItemKnowledge primary_image_url
      const ref = imageRefs.find(i => i.id === imgId);
      if (ref) await base44.entities.ItemKnowledge.update(item.id, { primary_image_url: ref.compressed_image_url || ref.original_image_url });
      loadRelated();
    } catch {}
    setSaving(false);
  };

  const handleHideImage = async (imgId) => {
    await base44.entities.ItemImageReference.update(imgId, { is_public_approved: false, retention_status: 'delete' });
    loadRelated();
  };

  const currentStatus = editForm.public_status;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b bg-slate-50 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-base truncate">{item.canonical_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`${STATUS_COLORS[item.public_status] || STATUS_COLORS.private} text-xs`}>{item.public_status || 'private'}</Badge>
              {item.brand && <Badge variant="outline" className="text-xs">{item.brand}</Badge>}
              {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
              {item.has_barcode && <Badge className="bg-purple-100 text-purple-700 text-xs">📦 Barcode</Badge>}
              {item.has_verified_image && <Badge className="bg-blue-100 text-blue-700 text-xs">🖼 Image</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 p-3 border-b bg-white shrink-0">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving} onClick={() => handleStatusChange('approved_public')}>
            <CheckCircle className="w-3 h-3 mr-1" /> Approve Public
          </Button>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={saving} onClick={() => handleStatusChange('review_needed')}>
            <AlertCircle className="w-3 h-3 mr-1" /> Send to Review
          </Button>
          <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" disabled={saving} onClick={() => handleStatusChange('rejected')}>
            <XCircle className="w-3 h-3 mr-1" /> Reject
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditing(!editing)}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={handleRerunMatching}>
            <RefreshCw className="w-3 h-3 mr-1" /> Re-run Matching
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">

          {/* Edit Form */}
          {editing && (
            <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
              <div className="font-medium text-slate-700">Edit Canonical Fields</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Canonical Name</Label>
                  <Input value={editForm.canonical_name} onChange={e => setEditForm(f => ({ ...f, canonical_name: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Brand</Label>
                  <Input value={editForm.brand} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Subcategory</Label>
                  <Input value={editForm.subcategory} onChange={e => setEditForm(f => ({ ...f, subcategory: e.target.value }))} className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Public Status</Label>
                  <Select value={editForm.public_status} onValueChange={v => setEditForm(f => ({ ...f, public_status: v }))}>
                    <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="review_needed">Review Needed</SelectItem>
                      <SelectItem value="approved_public">Approved Public</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={saving}><Save className="w-3 h-3 mr-1" /> Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Canonical Data */}
          <section>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Canonical Data</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                ['Canonical Name', item.canonical_name],
                ['Brand', item.brand],
                ['Category', item.category],
                ['Subcategory', item.subcategory],
                ['Item Type', item.item_type],
                ['Model', item.model],
                ['Pattern', item.pattern],
                ['Era', item.era],
                ['Style', item.style],
                ['Material', item.material],
                ['Color', item.color],
                ['Origin', item.country_of_origin],
                ['Times Seen', item.times_seen],
                ['Match Method', item.match_method_first],
                ['Confidence', `${item.confidence_score || 0}%`],
                ['Sources', (item.source_types_seen || []).join(', ')],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex gap-2">
                  <span className="text-slate-400 min-w-24 text-xs">{k}</span>
                  <span className="text-slate-700 text-xs font-medium">{v}</span>
                </div>
              ) : null)}
            </div>
          </section>

          {/* Descriptions */}
          {(item.short_description || item.long_description) && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Descriptions</div>
              {item.short_description && <p className="text-xs text-slate-700 mb-2 p-2 bg-slate-50 rounded">{item.short_description}</p>}
              {item.long_description && <p className="text-xs text-slate-600 p-2 bg-slate-50 rounded">{item.long_description}</p>}
              {item.historical_context && <p className="text-xs text-slate-500 mt-2 italic">{item.historical_context}</p>}
            </section>
          )}

          {/* SEO */}
          {(item.seo_title || item.seo_description) && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">SEO</div>
              {item.seo_title && <div className="text-xs text-slate-700 font-medium p-2 bg-blue-50 rounded">{item.seo_title}</div>}
              {item.seo_description && <div className="text-xs text-slate-600 p-2 bg-blue-50 rounded mt-1">{item.seo_description}</div>}
              {item.search_keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.search_keywords.map(kw => <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>)}
                </div>
              )}
            </section>
          )}

          {/* Images */}
          <section>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Image className="w-3 h-3" /> Image References ({imageRefs.length})
            </div>
            {loading ? <div className="text-xs text-slate-400">Loading…</div> : imageRefs.length === 0 ? (
              <div className="text-xs text-slate-400">No images</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imageRefs.slice(0, 9).map(ref => (
                  <div key={ref.id} className="relative group">
                    <img src={ref.compressed_image_url || ref.original_image_url} alt="" className="w-full h-20 object-cover rounded-lg border" onError={e => { e.target.style.display = 'none'; }} />
                    <div className="absolute top-1 left-1 flex gap-1">
                      {ref.is_primary_image && <Badge className="bg-emerald-600 text-white text-xs py-0 px-1">✓</Badge>}
                      {!ref.is_public_approved && <Badge className="bg-slate-600 text-white text-xs py-0 px-1">🔒</Badge>}
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 rounded-b-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleMarkPrimaryImage(ref.id)} className="text-white text-xs hover:underline">Primary</button>
                      <span className="text-white/40">·</span>
                      <button onClick={() => handleHideImage(ref.id)} className="text-white text-xs hover:underline">Hide</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Barcodes */}
          {barcodes.length > 0 && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Barcode className="w-3 h-3" /> Barcode Records ({barcodes.length})
              </div>
              {barcodes.map(b => (
                <div key={b.id} className="p-2 bg-purple-50 rounded text-xs flex gap-4">
                  <span className="font-mono font-bold text-purple-800">{b.barcode_value}</span>
                  <span className="text-slate-500">{b.barcode_type}</span>
                  <span className="text-slate-600">{b.product_title}</span>
                </div>
              ))}
            </section>
          )}

          {/* Price History */}
          {priceHistory.length > 0 && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> Price History ({priceHistory.length} records)
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 text-slate-500">Price</th>
                    <th className="text-left py-1 text-slate-500">Source</th>
                    <th className="text-left py-1 text-slate-500">Status</th>
                    <th className="text-left py-1 text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="py-1 font-medium text-emerald-700">${p.price?.toLocaleString()}</td>
                      <td className="py-1 text-slate-500">{p.source_type}</td>
                      <td className="py-1 text-slate-500">{p.sold_status}</td>
                      <td className="py-1 text-slate-400">{p.observed_at ? new Date(p.observed_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {item.avg_price && (
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>Avg: <strong className="text-slate-700">${item.avg_price?.toLocaleString()}</strong></span>
                  <span>Low: <strong className="text-slate-700">${item.low_price?.toLocaleString()}</strong></span>
                  <span>High: <strong className="text-slate-700">${item.high_price?.toLocaleString()}</strong></span>
                </div>
              )}
            </section>
          )}

          {/* Demand Metrics */}
          {demandMetrics && (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Demand Metrics
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Times Seen', demandMetrics.times_seen],
                  ['Active Inventory', demandMetrics.active_inventory_count],
                  ['Sold Count', demandMetrics.sold_inventory_count],
                  ['Watch Count', demandMetrics.watch_count],
                  ['Wanted', demandMetrics.wanted_count],
                  ['Demand Score', `${demandMetrics.demand_score}/100`],
                  ['Demand Trend', demandMetrics.demand_trend],
                  ['Price Trend', demandMetrics.price_trend],
                  ['Avg Days to Sell', demandMetrics.avg_days_to_sell || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 bg-slate-50 rounded text-center">
                    <div className="font-bold text-slate-800">{v ?? '—'}</div>
                    <div className="text-slate-400 text-xs">{k}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Source & Dates */}
          <section>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Source History</div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>Sources: <span className="font-medium">{(item.source_types_seen || []).join(', ') || '—'}</span></div>
              <div>First seen: <span className="font-medium">{item.first_seen_at ? new Date(item.first_seen_at).toLocaleString() : '—'}</span></div>
              <div>Last seen: <span className="font-medium">{item.last_seen_at ? new Date(item.last_seen_at).toLocaleString() : '—'}</span></div>
              <div>Created: <span className="font-medium">{item.created_date ? new Date(item.created_date).toLocaleString() : '—'}</span></div>
              <div>Updated: <span className="font-medium">{item.updated_date ? new Date(item.updated_date).toLocaleString() : '—'}</span></div>
              <div>Record ID: <span className="font-mono text-slate-400">{item.id}</span></div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}