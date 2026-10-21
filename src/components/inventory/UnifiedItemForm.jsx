import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import useSaleScope from '@/hooks/useSaleScope';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Save, AlertCircle, Plus, Check, Lightbulb, Lock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { researchBlocked, overridePayload } from '@/components/saleops/researchGuard';
import { LEVELS, LEVEL_META, levelRank, suggestLevel, locationDisplay, formatItemNumber } from '@/components/saleops/inventoryLevels';
import { logItemChange } from '@/components/saleops/itemHistory';
import PhotoLibrarySection from '@/components/inventory/PhotoLibrarySection';

const CATEGORIES = [
  'furniture', 'art', 'jewelry', 'home_decor', 'antiques', 'collectibles',
  'vehicles', 'estate_items', 'other',
];

const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

const FACT_SOURCES = [
  { value: 'OPERATOR_OBSERVATION', label: 'Operator observation' },
  { value: 'CLIENT_FAMILY_STATEMENT', label: 'Client / family statement (unverified)' },
  { value: 'DOCUMENTARY_EVIDENCE', label: 'Documentary evidence' },
  { value: 'RESEARCH_SOURCE', label: 'Research source' },
  { value: 'SPECIALIST_INPUT', label: 'Specialist input' },
];

const NOTE_SOURCES = [
  ...FACT_SOURCES,
  { value: 'AI_SUGGESTION', label: 'AI suggestion (never a verified fact)' },
];

const BLANK = {
  title: '', description: '', category: 'estate_items', condition: 'good',
  price: '', quantity: 1, sku: '', brand: '', size: '', shipping_weight: '',
  sales_channels: [], inventory_display_status: 'active', marketplace_display_status: 'draft',
  specs: {},
  // Chapter 15 P1
  inventory_level: 'STANDARD', zone_id: '', location_detail: '', group_note: '',
  included_text: '', excluded_text: '',
  maker: '', model: '', serial_number: '', signature_mark: '', materials: '',
  condition_notes: { damage: '', missing_parts: '', repairs: '' },
  dims: { height: '', width: '', depth: '' },
  dim_unit: 'in',
  verification_status: 'UNVERIFIED',
  research_needed: false,
  photo_library: [],
  verified_facts: [],
  research_notes: [],
  // Chapter 16 P1
  market_context: 'UNKNOWN', selling_channel: 'ESTATE_SALE',
  negotiation_locked: false, excluded_from_discounts: false,
  price_range_low: '', price_range_high: '', pricing_rationale: '',
  // Chapter 17 P1 — removal & pickup planning on the canonical record
  disassembly: 'UNKNOWN', disassembly_note: '', removal_note: '',
  pickup_scheduled: false, pickup_window: '', pickup_people: false,
  pickup_equipment: '', pickup_assistance: false, pickup_handling: '',
};

// Chapter 15 P1 — ONE Item form, four workflow DEPTHS. The record starts as simply as
// the merchandise justifies and becomes richer only when warranted; the same canonical
// record grows through QUICK → STANDARD → RESEARCH → HIGH_VALUE without recreation.
export default function UnifiedItemForm({ item = null, saleId = null, onClose, onSaved }) {
  const saleScope = useSaleScope(saleId);
  const [formData, setFormData] = useState({ ...BLANK });
  const [zones, setZones] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSource, setNoteSource] = useState('RESEARCH_SOURCE');
  const [factText, setFactText] = useState('');
  const [factSource, setFactSource] = useState('OPERATOR_OBSERVATION');
  // Chapter 14 P1-13/P1-14 — research-before-pricing guard state
  const [guardOpen, setGuardOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideApplied, setOverrideApplied] = useState(false);
  // Chapter 16 P0-4 — current user for HIGH_VALUE price authority
  const [currentUser, setCurrentUser] = useState(null);
  const [priceChangeReason, setPriceChangeReason] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!saleId) return;
      try {
        const sales = await base44.entities.EstateSale.filter({ id: saleId });
        if (sales.length > 0) setZones(sales[0].prep_zones || []);
      } catch (e) { /* zones optional */ }
    })();
  }, [saleId]);

  useEffect(() => {
    if (item) {
      setFormData({
        ...BLANK,
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'estate_items',
        condition: item.condition || 'good',
        price: item.price || '',
        quantity: item.quantity || 1,
        sku: item.sku || '',
        brand: item.brand || '',
        size: item.size || '',
        shipping_weight: item.shipping_weight || '',
        sales_channels: item.sales_channels || [],
        inventory_display_status: item.inventory_display_status || 'active',
        marketplace_display_status: item.marketplace_display_status || 'draft',
        specs: item.specs || {},
        inventory_level: item.inventory_level || 'STANDARD',
        zone_id: item.zone_id || '',
        location_detail: item.location_detail || '',
        group_note: item.group_note || '',
        included_text: (item.included_items || []).join('\n'),
        excluded_text: (item.excluded_items || []).join('\n'),
        maker: item.maker || '',
        model: item.model || '',
        serial_number: item.serial_number || '',
        signature_mark: item.signature_mark || '',
        materials: item.materials || '',
        condition_notes: {
          damage: item.condition_notes?.damage || '',
          missing_parts: item.condition_notes?.missing_parts || '',
          repairs: item.condition_notes?.repairs || '',
        },
        dims: {
          height: item.dimensions?.height ?? '',
          width: item.dimensions?.width ?? '',
          depth: item.dimensions?.depth ?? '',
        },
        dim_unit: item.dimensions?.unit || 'in',
        verification_status: item.verification_status || 'UNVERIFIED',
        research_needed: !!(item.research_status && !['CLEAR', 'READY_TO_PRICE'].includes(item.research_status)),
        photo_library: item.photo_library || [],
        verified_facts: item.verified_facts || [],
        research_notes: item.research_notes || [],
        market_context: item.market_context || 'UNKNOWN',
        selling_channel: item.selling_channel || 'ESTATE_SALE',
        negotiation_locked: item.negotiation_override === 'NO_DISCOUNT_WITHOUT_OPERATOR',
        excluded_from_discounts: !!item.excluded_from_discounts,
        price_range_low: item.price_range_low ?? '',
        price_range_high: item.price_range_high ?? '',
        pricing_rationale: item.pricing_rationale || '',
        disassembly: item.disassembly || 'UNKNOWN',
        disassembly_note: item.disassembly_note || '',
        removal_note: item.removal_note || '',
        pickup_scheduled: !!item.pickup_requirements?.scheduled_required,
        pickup_window: item.pickup_requirements?.pickup_window || '',
        pickup_people: !!item.pickup_requirements?.additional_people,
        pickup_equipment: item.pickup_requirements?.equipment_needed || '',
        pickup_assistance: !!item.pickup_requirements?.assistance_required,
        pickup_handling: item.pickup_requirements?.special_handling || '',
      });
    } else {
      // QUICK capture burden: creating inside a sale pre-selects the inventory channel.
      setFormData(prev => ({ ...BLANK, sales_channels: saleId ? ['inventory'] : [] }));
    }
  }, [item, saleId]);

  const suggestion = useMemo(
    () => suggestLevel({ category: formData.category, price: formData.price }),
    [formData.category, formData.price]
  );

  const rank = levelRank(formData.inventory_level);
  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }));

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Valid price is required';
    if (formData.sales_channels.length === 0) newErrors.sales_channels = 'Select at least one sales channel';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = async () => {
    const user = await base44.auth.me();
    const now = new Date().toISOString();
    const approvedUrls = (formData.photo_library || []).filter(p => p.approved_public && p.url).map(p => p.url);
    const legacyKept = (item?.images || []).filter(u => !(formData.photo_library || []).some(p => p.url === u));
    const publishedImages = [...new Set([...legacyKept, ...approvedUrls])];

    const stampFacts = (facts) => (facts || []).map(f => f.verified_at ? f : { ...f, verified_by: user.id, verified_by_name: user.full_name || user.email || '', verified_at: now });

    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      condition: formData.condition,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity) || 1,
      sku: formData.sku,
      brand: formData.brand,
      size: formData.size,
      shipping_weight: formData.shipping_weight === '' ? undefined : parseFloat(formData.shipping_weight),
      sales_channels: formData.sales_channels,
      inventory_display_status: formData.inventory_display_status,
      marketplace_display_status: formData.marketplace_display_status,
      specs: formData.specs,
      // Chapter 15 P1
      inventory_level: formData.inventory_level,
      zone_id: formData.zone_id || '',
      location_detail: formData.location_detail || '',
      group_note: formData.group_note || '',
      included_items: formData.included_text.split('\n').map(s => s.trim()).filter(Boolean),
      excluded_items: formData.excluded_text.split('\n').map(s => s.trim()).filter(Boolean),
      maker: formData.maker || '',
      model: formData.model || '',
      serial_number: formData.serial_number || '',
      signature_mark: formData.signature_mark || '',
      materials: formData.materials || '',
      condition_notes: {
        damage: formData.condition_notes.damage || '',
        missing_parts: formData.condition_notes.missing_parts || '',
        repairs: formData.condition_notes.repairs || '',
      },
      dimensions: {
        ...(item?.dimensions || {}),
        height: formData.dims.height === '' ? undefined : parseFloat(formData.dims.height),
        width: formData.dims.width === '' ? undefined : parseFloat(formData.dims.width),
        depth: formData.dims.depth === '' ? undefined : parseFloat(formData.dims.depth),
        unit: formData.dim_unit,
      },
      verification_status: formData.verification_status,
      photo_library: formData.photo_library,
      verified_facts: stampFacts(formData.verified_facts),
      research_notes: (formData.research_notes || []).map(n => n.at ? n : { ...n, at: now }),
      images: publishedImages,
      estate_sale_id: saleId,
      // Chapter 16 P1 — pricing context on the canonical record
      market_context: formData.market_context,
      selling_channel: formData.selling_channel,
      negotiation_override: formData.negotiation_locked
        ? 'NO_DISCOUNT_WITHOUT_OPERATOR' : 'NONE',
      excluded_from_discounts: formData.excluded_from_discounts,
      price_range_low: formData.price_range_low === ''
        ? null : parseFloat(formData.price_range_low),
      price_range_high: formData.price_range_high === ''
        ? null : parseFloat(formData.price_range_high),
      pricing_rationale: formData.pricing_rationale.trim() || null,
      // Chapter 17 P1-12..P1-15 — removal & pickup planning on the canonical record
      pickup_requirements: {
        scheduled_required: !!formData.pickup_scheduled,
        pickup_window: formData.pickup_window || '',
        additional_people: !!formData.pickup_people,
        equipment_needed: formData.pickup_equipment || '',
        assistance_required: !!formData.pickup_assistance,
        special_handling: formData.pickup_handling || '',
      },
      disassembly: formData.disassembly,
      disassembly_note: formData.disassembly_note || '',
      removal_note: formData.removal_note || '',
    };

    if (item?.id) {
      // Chapter 16 P0-4..P0-6 — the ONE sanctioned price-change path on an
      // existing record is the changeItemPrice function (authority + reason
      // + history). The general form save never writes Item.price here.
      delete payload.price;
      // The research flag lifecycle is owned by the Research action (ResearchFlagDialog);
      // editing here never rewrites it.
      delete payload.research_status;
    } else {
      payload.research_status = formData.research_needed ? 'RESEARCH_NEEDED' : 'CLEAR';
      payload.research_reason = formData.research_needed ? 'Flagged at creation — research before pricing.' : undefined;
      payload.research_flagged_at = formData.research_needed ? now : undefined;
    }
    return payload;
  };

  const handleSave = async ({ addAnother = false } = {}) => {
    if (!validateForm()) return;

    // Chapter 14 P1-13 — RESEARCH BEFORE PRICING guard (unchanged)
    if (item?.id && researchBlocked(item).blocked && !overrideApplied) {
      setGuardOpen(true);
      return;
    }

    setSaving(true);
    try {
      const payload = await buildPayload();
      let savedNumber = item?.item_number;

      if (item?.id) {
        // Chapter 16 P0-4/P0-5 — a price change on an existing record goes
        // through changeItemPrice (HIGH_VALUE authority + reason + history).
        const priceChanged = Number(item.price) !== Number(formData.price);
        if (priceChanged) {
          const isHighValueNow = formData.inventory_level === 'HIGH_VALUE';
          const priceAuthorized = !currentUser || currentUser.role === 'admin'
            || currentUser.id === item.operator_id || currentUser.id === item.seller_id;
          if (isHighValueNow && !priceAuthorized) {
            setSaving(false);
            toast.error('High Value price changes require the sale operator. Ask the operator to authorize this change.');
            return;
          }
          if (isHighValueNow && !priceChangeReason.trim()) {
            setSaving(false);
            toast.error('A reason is required for every High Value price change.');
            return;
          }
          await base44.functions.invoke('changeItemPrice', {
            item_id: item.id,
            new_price: parseFloat(formData.price),
            reason: priceChangeReason.trim() || undefined,
          });
        }
        await base44.entities.Item.update(item.id, payload);
        // Chapter 15 P1-30 — consequential change history (reuses Activity)
        if (item.inventory_level !== payload.inventory_level) {
          await logItemChange('level', item, `${item.inventory_level || 'STANDARD'} → ${payload.inventory_level}`, { saleId, operatorId: saleScope?.operatorId });
        }
        if ((item.verification_status || 'UNVERIFIED') !== payload.verification_status) {
          await logItemChange('verification', item, `${item.verification_status || 'UNVERIFIED'} → ${payload.verification_status}`, { saleId, operatorId: saleScope?.operatorId });
        }
        toast.success('Item updated successfully');
      } else {
        const user = await base44.auth.me();
        payload.seller_id = user.id;
        payload.operator_id = saleScope?.operatorId || user.id;
        payload.sale_team_ids = saleScope?.teamIds || [];
        payload.seller_name = user.full_name;
        // Chapter 16 P1-17 — opening price is written once, at first pricing.
        payload.original_price = payload.price;
        const created = await base44.entities.Item.create(payload);
        // Chapter 15 P1-10 — stable sale-scoped item number, assigned server-side.
        try {
          const res = await base44.functions.invoke('assignItemNumber', { item_id: created.id });
          savedNumber = res.data?.item_number;
        } catch (e) {
          console.warn('Item number assignment failed:', e?.message);
        }
        await logItemChange('created', { ...payload, id: created.id }, `${payload.inventory_level} level · $${payload.price}${savedNumber ? ` · ${formatItemNumber(savedNumber)}` : ''}`, { saleId, operatorId: saleScope?.operatorId });
        toast.success(`Item created${savedNumber ? ` — ${formatItemNumber(savedNumber)}` : ''}`);

        if (addAnother) {
          // Quick capture: keep the practical context, clear the merchandise.
          setFormData(prev => ({
            ...BLANK,
            sales_channels: prev.sales_channels,
            zone_id: prev.zone_id,
            location_detail: prev.location_detail,
            category: prev.category,
            inventory_level: prev.inventory_level,
          }));
          setSaving(false);
          return;
        }
      }

      if (onSaved) onSaved();
    } catch (err) {
      toast.error('Error saving item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = channel => {
    setFormData(prev => ({
      ...prev,
      sales_channels: prev.sales_channels.includes(channel)
        ? prev.sales_channels.filter(c => c !== channel)
        : [...prev.sales_channels, channel],
    }));
  };

  const addResearchNote = () => {
    if (!noteText.trim()) return;
    setFormData(prev => ({
      ...prev,
      research_notes: [...prev.research_notes, { text: noteText.trim(), source_type: noteSource }],
    }));
    setNoteText('');
  };

  const approveNoteAsFact = idx => {
    const note = formData.research_notes[idx];
    setFormData(prev => ({
      ...prev,
      research_notes: prev.research_notes.filter((_, i) => i !== idx),
      // P1-22 — the HUMAN APPROVAL BOUNDARY: moving a note here is what makes it
      // company-represented buyer-facing fact. The source label travels with it.
      verified_facts: [...prev.verified_facts, { text: note.text, source_type: note.source_type === 'AI_SUGGESTION' ? 'RESEARCH_SOURCE' : note.source_type }],
    }));
    toast.success('Approved as a company-represented fact.');
  };

  const addFact = () => {
    if (!factText.trim()) return;
    setFormData(prev => ({ ...prev, verified_facts: [...prev.verified_facts, { text: factText.trim(), source_type: factSource }] }));
    setFactText('');
  };

  const zoneName = (zones.find(z => z.zone_id === formData.zone_id) || {}).name;

  // Chapter 16 P0-4 — HIGH_VALUE price authority on existing records
  const priceLocked = !!(item?.id && formData.inventory_level === 'HIGH_VALUE'
    && currentUser && currentUser.role !== 'admin'
    && currentUser.id !== item.operator_id
    && currentUser.id !== item.seller_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-white border-b flex flex-row items-center justify-between">
          <CardTitle>{item ? `Edit Item ${formatItemNumber(item.item_number)}` : 'Create New Item'}</CardTitle>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Chapter 15 P1-1 — inventory level: workflow depth, human-chosen */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-900">Inventory level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEVELS.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => set('inventory_level', lvl)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                    formData.inventory_level === lvl
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-slate-200 hover:border-orange-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{LEVEL_META[lvl].label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{LEVEL_META[lvl].hint}</div>
                </button>
              ))}
            </div>
            {suggestion && suggestion.level !== formData.inventory_level && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Guidance suggests <button className="underline text-orange-600" onClick={() => set('inventory_level', suggestion.level)}>{LEVEL_META[suggestion.level].label}</button>
                <span className="text-slate-400">— {suggestion.note} You decide.</span>
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Level is workflow depth, not value. Changing it never deletes photos, research, history or offers.
            </p>
          </div>

          {/* Quick essentials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block font-semibold text-slate-900">Title *</label>
              <Input
                value={formData.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Item name or description"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-semibold text-slate-900 text-sm">Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">$</span>
                  <Input type="number" value={formData.price}
                    onChange={e => set('price', e.target.value)}
                    disabled={priceLocked} placeholder="0.00" className="pl-6" />
                </div>
                {priceLocked && (
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    High Value — only the sale operator can change this price.
                  </p>
                )}
                {errors.price && <p className="text-xs text-red-600">{errors.price}</p>}
              </div>
              <div className="space-y-2">
                <label className="block font-semibold text-slate-900 text-sm">Quantity</label>
                <Input type="number" min="1" value={formData.quantity} onChange={e => set('quantity', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Room / location — the Chapter 14 prep-zone registry reused (P1-14) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Room / zone</label>
              <select value={formData.zone_id} onChange={e => set('zone_id', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="">Not assigned</option>
                {zones.map(z => (
                  <option key={z.zone_id} value={z.zone_id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-slate-900 text-sm">Sub-location (optional)</label>
              <Input value={formData.location_detail} onChange={e => set('location_detail', e.target.value)} placeholder="Back Wall, Dresser, Upper Cabinet…" />
            </div>
          </div>
          {(zoneName || formData.location_detail) && (
            <p className="text-xs text-slate-500 -mt-3">Location: {locationDisplay({ zone_id: formData.zone_id, location_detail: formData.location_detail }, zones) || '—'}</p>
          )}

          {/* Grouped merchandise (P1-17) */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-900 text-sm">Group (optional)</label>
            <Input value={formData.group_note} onChange={e => set('group_note', e.target.value)} placeholder="Set of 6 glasses · Box of kitchen utensils · Contents of shelf" />
            {formData.group_note && (
              <p className="text-[10px] text-slate-400">One record represents the whole group ({formData.quantity} count). No child items unless individually tracked.</p>
            )}
          </div>

          {/* Sales channels (defaulted for sale inventory — quick capture) */}
          <div className="space-y-3">
            <label className="font-semibold text-slate-900 text-sm">Sales channels</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => toggleChannel('inventory')} className={`p-3 rounded-lg border-2 text-left ${formData.sales_channels.includes('inventory') ? 'border-gold-600 bg-gold-50' : 'border-slate-200'}`}>
                <div className="font-semibold text-sm">📦 Sale Inventory</div>
              </button>
              <button onClick={() => toggleChannel('marketplace')} className={`p-3 rounded-lg border-2 text-left ${formData.sales_channels.includes('marketplace') ? 'border-sage-600 bg-sage-50' : 'border-slate-200'}`}>
                <div className="font-semibold text-sm">🌐 Marketplace</div>
              </button>
            </div>
            {errors.sales_channels && <p className="text-xs text-red-600">{errors.sales_channels}</p>}
          </div>

          {/* STANDARD and above */}
          {rank >= 1 && (
            <>
              <div className="space-y-3">
                <label className="block font-semibold text-slate-900">Description</label>
                <Textarea value={formData.description} onChange={e => set('description', e.target.value)} placeholder="Item condition, features, history..." className="min-h-24" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-900 text-sm">Category</label>
                  <select value={formData.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-900 text-sm">Condition</label>
                  <select value={formData.condition} onChange={e => set('condition', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>
              </div>

              {/* Photos (P0/P1-23) */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-900">Photos</label>
                <PhotoLibrarySection photos={formData.photo_library} onChange={p => set('photo_library', p)} />
              </div>

              {/* Dimensions (P1-25) */}
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Height</label>
                  <Input type="number" value={formData.dims.height} onChange={e => setFormData(p => ({ ...p, dims: { ...p.dims, height: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Width</label>
                  <Input type="number" value={formData.dims.width} onChange={e => setFormData(p => ({ ...p, dims: { ...p.dims, width: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Depth</label>
                  <Input type="number" value={formData.dims.depth} onChange={e => setFormData(p => ({ ...p, dims: { ...p.dims, depth: e.target.value } }))} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Unit</label>
                  <select value={formData.dim_unit} onChange={e => set('dim_unit', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>

              {/* Included / excluded (P1-28) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">What's included</label>
                  <Textarea value={formData.included_text} onChange={e => set('included_text', e.target.value)} placeholder={'Mirror\nSpeakers'} className="min-h-16 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">What's NOT included</label>
                  <Textarea value={formData.excluded_text} onChange={e => set('excluded_text', e.target.value)} placeholder={'Shade'} className="min-h-16 text-sm" />
                </div>
              </div>

              {/* Chapter 17 P1-12..P1-15 — removal & pickup planning (furniture/large merchandise) */}
              <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                <p className="text-sm font-semibold text-slate-900">Removal & pickup (large merchandise)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Disassembly</span>
                    <select value={formData.disassembly} onChange={e => set('disassembly', e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="UNKNOWN">Unknown</option>
                      <option value="NOT_REQUIRED">Not required</option>
                      <option value="CAN_DISASSEMBLE">Can disassemble</option>
                      <option value="MUST_DISASSEMBLE">Must disassemble</option>
                      <option value="DO_NOT_DISASSEMBLE">Do NOT disassemble</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Pickup window (optional)</span>
                    <Input value={formData.pickup_window} onChange={e => set('pickup_window', e.target.value)} placeholder="Sat 3pm-5pm" className="mt-1 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Equipment needed</span>
                    <Input value={formData.pickup_equipment} onChange={e => set('pickup_equipment', e.target.value)} placeholder="Dolly, straps…" className="mt-1 text-sm" />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Removal path (internal — how it leaves the house)</span>
                    <Input value={formData.removal_note} onChange={e => set('removal_note', e.target.value)} placeholder="Side door, one flight, protect the turn at the landing" className="mt-1 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Disassembly note</span>
                    <Input value={formData.disassembly_note} onChange={e => set('disassembly_note', e.target.value)} placeholder="Buyer disassembles; hardware in a bag" className="mt-1 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Special handling (shown to buyers when it tells them what to do)</span>
                    <Input value={formData.pickup_handling} onChange={e => set('pickup_handling', e.target.value)} placeholder="Bring a helper; we cannot load" className="mt-1 text-sm" />
                  </label>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={formData.pickup_scheduled} onChange={e => set('pickup_scheduled', e.target.checked)} /> Scheduled pickup required</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={formData.pickup_people} onChange={e => set('pickup_people', e.target.checked)} /> Two-person removal</label>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={formData.pickup_assistance} onChange={e => set('pickup_assistance', e.target.checked)} /> Staff assistance required</label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-900 text-sm">Brand</label>
                  <Input value={formData.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand/manufacturer" />
                </div>
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-900 text-sm">Size</label>
                  <Input value={formData.size} onChange={e => set('size', e.target.value)} placeholder="S/M/L, etc." />
                </div>
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-900 text-sm">Shipping weight (lbs)</label>
                  <Input type="number" step="0.1" value={formData.shipping_weight} onChange={e => set('shipping_weight', e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-900 text-sm">SKU (optional)</label>
                <Input value={formData.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g., VIN-001" />
              </div>
            </>
          )}

          {/* Chapter 16 P1 — pricing context (evidence-based, operator-owned) */}
          {rank >= 2 && (
            <div className="space-y-4 border-t pt-4">
              <p className="font-semibold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-gold-600" />Pricing context</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Realistic market</label>
                  <select value={formData.market_context}
                    onChange={e => set('market_context', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="UNKNOWN">Unknown</option>
                    <option value="LOCAL_PICKUP">Local pickup</option>
                    <option value="REGIONAL">Regional</option>
                    <option value="NATIONAL">National</option>
                    <option value="ONLINE_SHIPPED">Online shipped</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Selling channel</label>
                  <select value={formData.selling_channel}
                    onChange={e => set('selling_channel', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                    <option value="ESTATE_SALE">Estate sale</option>
                    <option value="AUCTION">Auction</option>
                    <option value="CONSIGNMENT">Consignment</option>
                    <option value="SPECIALTY_MARKETPLACE">Specialty marketplace</option>
                    <option value="DIRECT_SALE">Direct sale</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Operator range — low</label>
                  <Input type="number" value={formData.price_range_low}
                    onChange={e => set('price_range_low', e.target.value)}
                    placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Operator range — high</label>
                  <Input type="number" value={formData.price_range_high}
                    onChange={e => set('price_range_high', e.target.value)}
                    placeholder="Optional" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Pricing rationale</label>
                <Textarea value={formData.pricing_rationale}
                  onChange={e => set('pricing_rationale', e.target.value)}
                  placeholder="Three sold comparables; condition below strongest comparable; short selling window…"
                  className="min-h-16 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={formData.negotiation_locked}
                    onChange={e => set('negotiation_locked', e.target.checked)}
                    className="mt-0.5" />
                  <span>No discount without the operator (overrides company policy for this item)</span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={formData.excluded_from_discounts}
                    onChange={e => set('excluded_from_discounts', e.target.checked)}
                    className="mt-0.5" />
                  <span>Excluded from the sale's planned discount schedule</span>
                </label>
              </div>
              {item?.id && formData.inventory_level === 'HIGH_VALUE' && !priceLocked && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Reason for this price change</label>
                  <Input value={priceChangeReason}
                    onChange={e => setPriceChangeReason(e.target.value)}
                    placeholder="Required — recorded in the item's price history" />
                </div>
              )}
            </div>
          )}

          {/* RESEARCH and above — identification, evidence, facts vs notes */}
          {rank >= 2 && (
            <div className="space-y-4 border-t pt-4">
              <p className="font-semibold text-slate-900 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-violet-600" />Research &amp; identification</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Maker / artist</label>
                  <Input value={formData.maker} onChange={e => set('maker', e.target.value)} placeholder="Known maker or unknown" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Model</label>
                  <Input value={formData.model} onChange={e => set('model', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Serial number</label>
                  <Input value={formData.serial_number} onChange={e => set('serial_number', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Signature / mark (what was seen)</label>
                  <Input value={formData.signature_mark} onChange={e => set('signature_mark', e.target.value)} placeholder="Observed mark — not an authentication" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="block text-sm font-semibold text-slate-900">Materials</label>
                  <Input value={formData.materials} onChange={e => set('materials', e.target.value)} placeholder="Oak, brass, sterling…" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Damage</label>
                  <Input value={formData.condition_notes.damage} onChange={e => setFormData(p => ({ ...p, condition_notes: { ...p.condition_notes, damage: e.target.value } }))} placeholder="Chips, cracks, wear…" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Missing parts</label>
                  <Input value={formData.condition_notes.missing_parts} onChange={e => setFormData(p => ({ ...p, condition_notes: { ...p.condition_notes, missing_parts: e.target.value } }))} />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="block text-sm font-semibold text-slate-900">Repairs</label>
                  <Input value={formData.condition_notes.repairs} onChange={e => setFormData(p => ({ ...p, condition_notes: { ...p.condition_notes, repairs: e.target.value } }))} />
                </div>
              </div>

              {!item && (
                <label className="flex items-center gap-2 text-sm bg-violet-50 border border-violet-200 rounded-lg p-3">
                  <input type="checkbox" checked={formData.research_needed} onChange={e => set('research_needed', e.target.checked)} />
                  <span>Needs research before pricing <span className="text-xs text-slate-500">(blocks pricing until resolved or an operator overrides)</span></span>
                </label>
              )}
              {item && (item.research_status || 'CLEAR') !== 'CLEAR' && (
                <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded px-2.5 py-1.5">
                  This item is flagged for research. Change the flag from the item's Research action, not here.
                </p>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Verification status</label>
                <select value={formData.verification_status} onChange={e => set('verification_status', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="RESEARCHING">Researching</option>
                  <option value="REASONABLY_VERIFIED">Reasonably verified (business process — not an authentication)</option>
                  <option value="SPECIALIST_REVIEWED">Specialist reviewed (not a certification)</option>
                </select>
              </div>

              {/* Facts vs research (P1-18/P1-22) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Research notes (working — not buyer-facing)</label>
                <div className="flex gap-2 flex-wrap">
                  <select value={noteSource} onChange={e => setNoteSource(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                    {NOTE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Possibly made by Example Maker… (one note at a time)" className="flex-1 min-w-[160px] text-sm" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addResearchNote(); } }} />
                  <Button type="button" size="sm" variant="outline" onClick={addResearchNote} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add</Button>
                </div>
                {formData.research_notes.map((n, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5">
                    <span className="min-w-0">
                      <Badge variant="secondary" className="text-[9px] mr-1.5">{(n.source_type || '').replace(/_/g, ' ').toLowerCase()}</Badge>
                      {n.text}
                    </span>
                    <Button type="button" size="sm" variant="ghost" className="text-green-700 gap-1 shrink-0" title="Approve as a company-represented fact" onClick={() => approveNoteAsFact(idx)}>
                      <Check className="w-3.5 h-3.5" /> Approve fact
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">Verified facts (company-represented, buyer-facing)</label>
                <div className="flex gap-2 flex-wrap">
                  <select value={factSource} onChange={e => setFactSource(e.target.value)} className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs">
                    {FACT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <Input value={factText} onChange={e => setFactText(e.target.value)} placeholder="Stated as the company is willing to represent it" className="flex-1 min-w-[160px] text-sm" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFact(); } }} />
                  <Button type="button" size="sm" variant="outline" onClick={addFact} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add</Button>
                </div>
                {formData.verified_facts.map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-green-50 border border-green-200 rounded px-2.5 py-1.5">
                    <span className="min-w-0">
                      <Badge variant="secondary" className="text-[9px] mr-1.5">{(f.source_type || '').replace(/_/g, ' ').toLowerCase()}</Badge>
                      {f.text}
                    </span>
                    <button className="text-red-500 shrink-0" onClick={() => setFormData(p => ({ ...p, verified_facts: p.verified_facts.filter((_, i) => i !== idx) }))}>✕</button>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400">
                  Facts First: only what an authorized human approves here becomes buyer-facing. AI suggestions and family statements stay in research notes until approved.
                </p>
              </div>
            </div>
          )}

          {/* HIGH_VALUE — custody expectations */}
          {rank >= 3 && (
            <div className="space-y-2 border-t pt-4">
              <p className="font-semibold text-slate-900 flex items-center gap-2"><Lock className="w-4 h-4 text-amber-600" />High-value controls</p>
              <p className="text-xs text-slate-500">
                Record controlled location, custody movements and off-site research from the item's Custody action on the
                inventory list. High Value is an operational depth — never an appraisal or authentication. Consider
                display attention and checkout hold for controlled merchandise.
              </p>
              {item?.controlled_location && (
                <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 text-amber-800">
                  Controlled location: {item.controlled_location} (operator-private)
                </p>
              )}
            </div>
          )}

          {/* Channel display settings */}
          {formData.sales_channels.includes('inventory') && (
            <div className="space-y-3 bg-gold-50 border border-gold-200 rounded-lg p-4">
              <label className="font-semibold text-sm text-slate-900">Inventory Display</label>
              <select value={formData.inventory_display_status} onChange={e => set('inventory_display_status', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="active">Show in Sale (Active)</option>
                <option value="inactive">Hide from Sale (Inactive)</option>
              </select>
            </div>
          )}
          {formData.sales_channels.includes('marketplace') && (
            <div className="space-y-3 bg-sage-50 border border-sage-200 rounded-lg p-4">
              <label className="font-semibold text-sm text-slate-900">Marketplace Display</label>
              <select value={formData.marketplace_display_status} onChange={e => set('marketplace_display_status', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="draft">Draft (Not Published)</option>
                <option value="active">Live on Marketplace</option>
              </select>
            </div>
          )}

          {/* Chapter 14 P1-13 — research-before-pricing guard notice (unchanged) */}
          {item && researchBlocked(item).blocked && !overrideApplied && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm">
              <p className="font-semibold text-amber-900 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />RESEARCH BEFORE PRICING</p>
              <p className="text-xs text-amber-800 mt-0.5">
                This item is flagged “{item.research_status}”{item.research_reason ? ` — ${item.research_reason}` : ''}.
                Resolve the research first, or an authorized operator records an explicit override with a reason.
                Research needed is not low value.
              </p>
            </div>
          )}
          {item && researchBlocked(item).overridden && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              Research guard overridden{item.research_override_by_name ? ` by ${item.research_override_by_name}` : ''}{item.research_override_reason ? `: “${item.research_override_reason}”` : ''} — the flag stays visible alongside the override.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t flex-wrap">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            {!item && (
              <Button
                variant="outline"
                onClick={() => handleSave({ addAnother: true })}
                disabled={saving}
                className="flex-1 border-orange-300 text-orange-700"
              >
                {saving ? 'Saving…' : 'Save & Add Another'}
              </Button>
            )}
            <Button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex-1 bg-gold-600 hover:bg-gold-700 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chapter 14 P1-14 — authorized operator override dialog (unchanged) */}
      {guardOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle className="text-base">Research guard</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-600">
                “{item?.title}” is flagged for research. The honest path is to resolve the research first.
                To proceed anyway, an authorized operator records an explicit reason — it is saved on the item (who, when, why) and the flag stays visible.
              </p>
              <Input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Business reason for proceeding without completed research" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setGuardOpen(false); setOverrideReason(''); }}>Cancel</Button>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" disabled={!overrideReason.trim() || saving}
                  onClick={async () => {
                    try {
                      const user = await base44.auth.me();
                      await base44.entities.Item.update(item.id, overridePayload(overrideReason.trim(), user.id, user.full_name || user.email || ''));
                      setOverrideApplied(true);
                      setGuardOpen(false);
                      toast.success('Override recorded — saving');
                      handleSave();
                    } catch (err) { toast.error('Could not record override: ' + err.message); }
                  }}>
                  Record Override & Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}