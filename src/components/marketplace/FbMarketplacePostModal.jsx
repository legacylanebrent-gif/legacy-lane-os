import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ImageOff, CheckCircle2, Check } from 'lucide-react';
import MarketplacePostCard from '@/components/marketplace/MarketplacePostCard';

const money = (value) => (typeof value === 'number' && Number.isFinite(value) ? `$${value}` : '');

// FB Marketplace post simulator for one sale.
//
// 1. The operator picks from the photos already uploaded for the sale.
// 2. The AI writes a Marketplace listing for each pick from that item's own
//    title, description and asking price — never inventing a brand, size or flaw.
// 3. Every field copies on its own, so the listing goes onto Facebook by paste.
//
// Facebook has no public Marketplace posting API yet. Each post is saved as a
// draft, which is what makes this section ready to auto post when one exists.
export default function FbMarketplacePostModal({ open, onClose, sale, user }) {
  const [saleRecord, setSaleRecord] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Field edits save on blur, so the save always reads the newest values.
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => {
    if (!open || !sale?.id) return;
    load();
  }, [open, sale?.id]);

  const load = async () => {
    setLoading(true);
    setError('');
    setSelected([]);
    try {
      const [full, saved] = await Promise.all([
        base44.entities.EstateSale.get(sale.id),
        base44.entities.MarketplacePostDraft.filter({ sale_id: sale.id }, { sort: '-created_date' }),
      ]);
      setSaleRecord(full);
      const list = (full?.images || [])
        .filter(img => img && img.url && img.skip_item !== true && img.excluded_from_public !== true)
        .map(img => ({
          key: img.url,
          url: img.url,
          thumbnail_url: img.thumbnail_url || img.url,
          name: img.name || '',
          description: img.description || '',
          price: typeof img.price === 'number' ? img.price : null,
          categories: Array.isArray(img.categories) ? img.categories : [],
        }));
      setPhotos(list);
      setDrafts(saved || []);
    } catch (e) {
      console.error('Could not load Marketplace posts:', e);
      setError('Could not load this sale photos. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const draftedKeys = useMemo(() => new Set(drafts.map(d => d.photo_key)), [drafts]);

  const togglePhoto = (key) => {
    setSelected(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const generate = async () => {
    const chosen = photos.filter(p => selected.includes(p.key));
    if (chosen.length === 0) return;
    setGenerating(true);
    setError('');
    try {
      const items = chosen.map((photo, index) => ({
        key: String(index),
        title: photo.name,
        description: photo.description,
        price: photo.price,
        categories: photo.categories,
      }));

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You write Facebook Marketplace listings for a US estate sale company. For each item below write one ready to post listing.

Rules:
- Title: 5 to 9 words, plain sentence case, no ALL CAPS, no emojis, no quotes, no hyphens or dashes.
- Price: whole US dollars. Use the item's own asking price when one is given. Otherwise suggest a fair estate sale price.
- Description: 2 to 4 short sentences, friendly first person seller voice. Say it is from an estate sale and that all sales are final. Mention condition only when the item data states it.
- Category: one short Marketplace style category such as Furniture, Home Decor, Tools, Electronics, Clothing, Kitchen, Toys, Books or Jewelry.
- Condition: exactly one of New, Used Like New, Used Good, Used Fair.
- Tags: up to 5 short search words.
- Never invent a brand, maker, model, size, measurement, material or flaw that the item data does not state. If the item has no name or description, write only what its photo category and price support.

Items:
${JSON.stringify(items, null, 2)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            posts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  key: { type: 'string' },
                  title: { type: 'string' },
                  price: { type: 'number' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  condition: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                },
                required: ['key', 'title', 'description'],
              },
            },
          },
          required: ['posts'],
        },
      });

      const byKey = new Map((res?.posts || []).map(post => [String(post.key), post]));
      const operatorId = saleRecord?.operator_id || sale?.operator_id || user?.id || '';
      const savedDrafts = [];

      for (let index = 0; index < chosen.length; index += 1) {
        const photo = chosen[index];
        const post = byKey.get(String(index)) || {};
        const payload = {
          sale_id: sale.id,
          operator_id: operatorId,
          photo_key: photo.key,
          photo_url: photo.url,
          thumbnail_url: photo.thumbnail_url,
          item_name: photo.name,
          source_price: photo.price,
          source_description: photo.description,
          fb_title: post.title || photo.name,
          fb_price: typeof post.price === 'number' ? post.price : photo.price,
          fb_description: post.description || photo.description,
          fb_category: post.category || '',
          fb_condition: ['New', 'Used Like New', 'Used Good', 'Used Fair'].includes(post.condition) ? post.condition : '',
          fb_tags: Array.isArray(post.tags) ? post.tags.slice(0, 5) : [],
          status: 'draft',
          generated_at: new Date().toISOString(),
        };
        const existing = drafts.find(draft => draft.photo_key === photo.key);
        const saved = existing
          ? await base44.entities.MarketplacePostDraft.update(existing.id, payload)
          : await base44.entities.MarketplacePostDraft.create(payload);
        savedDrafts.push(saved);
      }

      setDrafts(prev => {
        const map = new Map(prev.map(draft => [draft.photo_key, draft]));
        savedDrafts.forEach(draft => map.set(draft.photo_key, draft));
        return [...map.values()];
      });
      setSelected([]);
    } catch (e) {
      console.error('Could not write Marketplace posts:', e);
      setError('The AI could not write the posts right now. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = (id, patch) => {
    setDrafts(prev => prev.map(draft => (draft.id === id ? { ...draft, ...patch } : draft)));
  };

  // Edits save when a field loses focus — the draft is always what the operator sees.
  const persistDraft = async (id) => {
    const draft = draftsRef.current.find(item => item.id === id);
    if (!draft) return;
    try {
      await base44.entities.MarketplacePostDraft.update(id, {
        fb_title: draft.fb_title || '',
        fb_price: typeof draft.fb_price === 'number' ? draft.fb_price : null,
        fb_description: draft.fb_description || '',
        fb_category: draft.fb_category || '',
        fb_condition: draft.fb_condition || '',
        fb_tags: Array.isArray(draft.fb_tags) ? draft.fb_tags : [],
        status: 'copied',
        copied_at: new Date().toISOString(),
      });
      setDrafts(prev => prev.map(item => (item.id === id ? { ...item, status: 'copied' } : item)));
    } catch (e) {
      console.error('Could not save Marketplace post edits:', e);
    }
  };

  const orderedDrafts = useMemo(
    () => [...drafts].sort((a, b) => String(b.generated_at || '').localeCompare(String(a.generated_at || ''))),
    [drafts],
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>FB Marketplace Posts</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-orange-600 rounded-full animate-spin mx-auto mb-3" />
            Loading this sale's photos...
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              {sale?.title} — pick the items you will post to Facebook Marketplace. The AI writes a listing for each
              one from its own title, description and price, and every field copies with one tap.
            </p>

            <div className="rounded-lg border border-slate-200 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  1. Choose items ({selected.length} selected)
                </p>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelected(photos.map(photo => photo.key))}
                    className="text-slate-600 hover:text-slate-900 underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="text-slate-600 hover:text-slate-900 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <ImageOff className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No item photos uploaded for this sale yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Add photos in the Sale Editor, then come back to post them.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {photos.map(photo => {
                    const isSelected = selected.includes(photo.key);
                    return (
                      <button
                        key={photo.key}
                        type="button"
                        onClick={() => togglePhoto(photo.key)}
                        className={`relative rounded-lg border-2 p-1 text-left transition-colors ${
                          isSelected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`absolute top-1.5 left-1.5 z-10 w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-orange-600 border-orange-600' : 'bg-white border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {draftedKeys.has(photo.key) && (
                          <div className="absolute top-1.5 right-1.5 z-10 bg-white rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                        )}
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.name || 'Sale item'}
                          className="w-full aspect-square object-cover rounded mb-1"
                        />
                        <p className="text-[10px] font-medium text-slate-700 line-clamp-2 leading-tight">
                          {photo.name || 'Untitled item'}
                        </p>
                        {money(photo.price) && (
                          <p className="text-[10px] text-slate-500">{money(photo.price)}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={generate}
                  disabled={generating || selected.length === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generating ? 'Writing posts...' : `Create posts with AI${selected.length ? ` (${selected.length})` : ''}`}
                </Button>
                {draftedKeys.size > 0 && (
                  <span className="text-xs text-slate-500">
                    {draftedKeys.size} post{draftedKeys.size === 1 ? '' : 's'} already written
                  </span>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {orderedDrafts.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    2. Copy into Facebook Marketplace ({orderedDrafts.length})
                  </p>
                  <p className="text-xs text-slate-500">
                    Facebook has no public Marketplace posting API yet. Every post is saved on this sale and ready to
                    auto post the day one exists.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {orderedDrafts.map(draft => (
                    <MarketplacePostCard
                      key={draft.id}
                      draft={draft}
                      onChange={(patch) => updateDraft(draft.id, patch)}
                      onPersist={() => persistDraft(draft.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {orderedDrafts.length === 0 && !generating && photos.length > 0 && (
              <p className="text-sm text-slate-500">
                Nothing written yet. Pick the items above and the AI will build a Marketplace post for each one.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}