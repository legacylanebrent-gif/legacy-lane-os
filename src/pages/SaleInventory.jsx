import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UnifiedItemForm from '@/components/inventory/UnifiedItemForm';
import SoldDetailsDialog from '@/components/estate/SoldDetailsDialog';
import OffersPanel from '@/components/estate/OffersPanel';
import { Plus, Search, Edit2, Trash2, Package, Globe, AlertCircle, FileText, User, CreditCard, MapPin, PackageCheck, FlaskConical, Eye, Tag, Lock, Printer, BookOpen, Scale } from 'lucide-react';
import ResearchFlagDialog from '@/components/inventory/ResearchFlagDialog';
import DisplayAttentionDialog from '@/components/inventory/DisplayAttentionDialog';
import ItemCustodyDialog from '@/components/inventory/ItemCustodyDialog';
import InventoryRulesDialog from '@/components/inventory/InventoryRulesDialog';
import PricingWorkspace from '@/components/inventory/PricingWorkspace';
import { formatItemNumber, locationDisplay, LEVEL_META, readinessCues } from '@/components/saleops/inventoryLevels';
import { logItemChange } from '@/components/saleops/itemHistory';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function SaleInventory() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get('id');

  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [researchFilter, setResearchFilter] = useState('all');
  const [researchDialogItem, setResearchDialogItem] = useState(null);
  const [attentionDialogItem, setAttentionDialogItem] = useState(null);
  const [soldDialogItem, setSoldDialogItem] = useState(null);
  const [custodyItem, setCustodyItem] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [pricingItem, setPricingItem] = useState(null);

  useEffect(() => {
    loadData();
  }, [saleId]);

  useEffect(() => {
    filterItems();
  }, [items, searchQuery, statusFilter, researchFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (saleId) {
        const saleData = await base44.entities.EstateSale.filter({ id: saleId });
        setSale(saleData[0]);
      }

      const itemData = await base44.entities.Item.filter({
        estate_sale_id: saleId,
      });
      setItems(itemData || []);
    } catch (error) {
      toast.error('Error loading inventory: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          String(item.item_number || '').includes(q),
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (researchFilter === 'flagged') {
      filtered = filtered.filter(item => item.research_status && item.research_status !== 'CLEAR');
    }

    setFilteredItems(filtered);
  };

  const handleDelete = async item => {
    if (!confirm(`Delete "${item.title}"?`)) return;

    try {
      await base44.entities.Item.delete(item.id);
      toast.success('Item deleted');
      loadData();
    } catch (error) {
      toast.error('Error deleting item: ' + error.message);
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    // Chapter 2 P1 — capture buyer/payment/pickup details when marking sold
    if (newStatus === 'sold') { setSoldDialogItem(item); return; }
    // Chapter 17 P1-17/P1-49 — STATUS SAFETY: a sold item returning to the
    // floor is a physical/digital contradiction. Surface it explicitly — never
    // silently allow it. (The change is still recorded in item history.)
    if (item.status === 'sold' && newStatus === 'available') {
      const released = !!item.pickup_completed_at;
      const ok = window.confirm(
        `"${item.title}" is SOLD${released ? ' and already RELEASED to the buyer' : ' and awaiting pickup'}. Return it to AVAILABLE on the floor?`
      );
      if (!ok) return;
    }
    try {
      const updates = { status: newStatus };
      if (newStatus === 'sold') {
        updates.sold_date = new Date().toISOString();
        // Determine phase based on sale dates
        if (sale?.sale_dates?.length > 0) {
          const today = new Date();
          const saleStart = new Date(sale.sale_dates[0].date + 'T00:00:00');
          const saleEnd = new Date(sale.sale_dates[sale.sale_dates.length - 1].date + 'T23:59:59');
          if (today < saleStart) updates.sale_phase = 'pre_sale';
          else if (today > saleEnd) updates.sale_phase = 'post_sale';
          else updates.sale_phase = 'during_sale';
        }
      }
      await base44.entities.Item.update(item.id, updates);
      await logItemChange('status', item, `${item.status} → ${newStatus}`, { saleId, operatorId: sale?.operator_id });
      toast.success(`Item marked as ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error('Error updating item: ' + error.message);
    }
  };

  const applySoldDetails = async (item, details) => {
    try {
      const updates = { status: 'sold', sold_date: new Date().toISOString() };
      if (sale?.sale_dates?.length > 0) {
        const today = new Date();
        const saleStart = new Date(sale.sale_dates[0].date + 'T00:00:00');
        const saleEnd = new Date(sale.sale_dates[sale.sale_dates.length - 1].date + 'T23:59:59');
        if (today < saleStart) updates.sale_phase = 'pre_sale';
        else if (today > saleEnd) updates.sale_phase = 'post_sale';
        else updates.sale_phase = 'during_sale';
      }
      if (details) {
        updates.buyer_name = details.buyer_name || '';
        updates.buyer_contact = details.buyer_contact || '';
        updates.payment_method_used = details.payment_method_used || '';
        updates.payment_notes = details.payment_notes || '';
        updates.authorized_pickup = details.authorized_pickup || '';
        if (details.pickup_instructions) {
          updates.pickup_location = { ...(item.pickup_location || {}), instructions: details.pickup_instructions };
        }
      }
      await base44.entities.Item.update(item.id, updates);
      await logItemChange('status', item, `${item.status} → sold (manual${details?.payment_method_used ? `, ${details.payment_method_used}` : ', no payment record'})`, { saleId, operatorId: sale?.operator_id });
      toast.success(details ? 'Item marked as sold with details' : 'Item marked as sold');
      if (!details?.payment_method_used) {
        toast.warning('Manually marked sold — NO payment record. Record the payment at Checkout/POS.');
      }
      setSoldDialogItem(null);
      loadData();
    } catch (error) {
      toast.error('Error updating item: ' + error.message);
    }
  };

  // Chapter 15 P1-55/P1-56 — printable inventory backup: a connectivity backup prepared
  // BEFORE connectivity loss (this is NOT offline application support), plus a critical
  // section (research / high value / awaiting pickup / controlled location).
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const printBackup = () => {
    const rows = filteredItems.length ? filteredItems : items;
    if (rows.length === 0) {
      toast.error('No items to print');
      return;
    }
    const zones = sale?.prep_zones || [];
    const rowHtml = it => `<tr>
      <td>${it.item_number != null ? it.item_number : '—'}</td>
      <td>${esc(it.title)}</td>
      <td>${esc(it.category || '')}</td>
      <td>${esc(LEVEL_META[it.inventory_level]?.label || 'Standard')}</td>
      <td>$${Number(it.price || 0).toFixed(2)}</td>
      <td>${esc(it.status)}${it.research_status && it.research_status !== 'CLEAR' ? ' / research' : ''}</td>
      <td>${esc(locationDisplay(it, zones))}</td>
      <td>${it.status === 'sold' ? (it.pickup_completed_at ? 'Released' : 'Awaiting pickup') : ''}</td>
    </tr>`;
    const crit = rows.filter(it =>
      ['RESEARCH', 'HIGH_VALUE'].includes(it.inventory_level) ||
      (it.status === 'sold' && !it.pickup_completed_at) ||
      it.controlled_location ||
      it.offsite_research?.status === 'OFFSITE'
    );
    const head = '<thead><tr><th>#</th><th>Title</th><th>Category</th><th>Level</th><th>Price</th><th>Status</th><th>Location</th><th>Pickup</th></tr></thead>';
    const html = `<!DOCTYPE html><html><head><title>Inventory backup — ${esc(sale.title)}</title><style>
      body { font-family: Arial, sans-serif; padding: 10mm; }
      h1 { font-size: 16px; margin: 0 0 2mm; }
      h2 { font-size: 13px; margin: 8mm 0 2mm; }
      p.meta { font-size: 10px; color: #555; margin: 0 0 4mm; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #999; padding: 3px 5px; text-align: left; }
      th { background: #eee; }
    </style></head><body>
      <h1>${esc(sale.title)} — Inventory backup (${rows.length} items)</h1>
      <p class="meta">Printed ${new Date().toLocaleString()} · connectivity backup, not offline sync · research/high-value/pickup details included below</p>
      <table>${head}<tbody>${rows.map(rowHtml).join('')}</tbody></table>
      ${crit.length > 0 ? `<h2>Critical items (${crit.length}) — research, high value, controlled location or awaiting pickup</h2>
      <table>${head}<tbody>${crit.map(rowHtml).join('')}</tbody></table>` : ''}
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      const el = document.createElement('div');
      el.innerHTML = html;
      document.body.appendChild(el);
      window.print();
      document.body.removeChild(el);
    }
  };

  const handleTogglePrePost = async (item, field) => {
    try {
      await base44.entities.Item.update(item.id, { [field]: !item[field] });
      toast.success('Updated');
      loadData();
    } catch (error) {
      toast.error('Error updating item');
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'sold':
        return 'bg-slate-100 text-slate-700';
      case 'reserved':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Sale not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold text-navy-900">
                {sale.title} — Inventory
              </h1>
              <p className="text-slate-600 mt-2">Manage items for sale and marketplace</p>
            </div>
            <div className="flex gap-2">
              {saleId && (
                <Link to={`/SettlementStatement?saleId=${saleId}`}>
                  <Button variant="outline" className="gap-2 text-orange-600 border-orange-300">
                    <FileText className="w-4 h-4" /> Settlement
                  </Button>
                </Link>
              )}
              {saleId && (
                <Link to={`/ItemLabels?saleId=${saleId}`}>
                  <Button variant="outline" className="gap-2">
                    <Tag className="w-4 h-4" /> QR Labels
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="gap-2" onClick={printBackup} title="Printable inventory backup (connectivity backup — not offline sync)">
                <Printer className="w-4 h-4" /> Backup List
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setRulesOpen(true)} title="Company inventory guidance">
                <BookOpen className="w-4 h-4" /> Guidance
              </Button>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowForm(true);
                }}
                className="bg-orange-600 hover:bg-orange-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
            <select
              value={researchFilter}
              onChange={e => setResearchFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">All Research States</option>
              <option value="flagged">Research Needed (flagged)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Pre/Post sale phase legend */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 print:hidden">
        <div className="flex gap-3 text-xs text-slate-500 flex-wrap">
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Pre-Sale = sold before sale event</span>
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded">During Sale = sold during event dates</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">Post-Sale = sold after event ends</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OffersPanel saleId={saleId} items={items} />

        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No items found</h3>
            <p className="text-slate-500 mt-2">
              {items.length === 0 ? 'Create your first item to get started' : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center justify-between gap-4"
              >
                {/* Item Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{formatItemNumber(item.item_number)} {item.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{item.description}</p>

                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Badge variant="secondary">{item.category}</Badge>
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        <Badge className="bg-orange-100 text-orange-700" title={LEVEL_META[item.inventory_level]?.description}>{LEVEL_META[item.inventory_level]?.label || 'Standard'}</Badge>
                        {(item.zone_id || item.location_detail) && (
                          <Badge variant="outline" className="text-slate-600">{locationDisplay(item, sale?.prep_zones)}</Badge>
                        )}
                        {item.group_note && <Badge variant="outline" className="text-slate-500">{item.group_note}</Badge>}
                        {readinessCues(item).map(c => (
                          <Badge
                            key={c.key}
                            className={c.tone === 'amber' ? 'bg-amber-100 text-amber-700' : c.tone === 'blue' ? 'bg-blue-100 text-blue-700' : c.tone === 'green' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}
                          >
                            {c.label}
                          </Badge>
                        ))}
                        {item.research_status && item.research_status !== 'CLEAR' && (
                          <Badge
                            className="bg-violet-100 text-violet-700 border border-violet-300"
                            title={item.research_reason || ''}
                          >
                            Research: {item.research_status === 'VERIFY' ? 'Verify' : item.research_status === 'SPECIALIST_REVIEW' ? 'Specialist' : 'Needed'}
                          </Badge>
                        )}

                        {item.display_attention && item.display_attention !== 'NONE' && (
                          <Badge
                            className="bg-amber-100 text-amber-700 border border-amber-300"
                            title="Internal handling note — never shown publicly"
                          >
                            {item.display_attention.replace(/_/g, ' ')}
                          </Badge>
                        )}

                        {item.sales_channels?.includes('inventory') && (
                          <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Inventory
                          </Badge>
                        )}

                        {item.sales_channels?.includes('marketplace') && (
                          <Badge className="bg-sage-100 text-sage-700 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Marketplace
                          </Badge>
                        )}

                        {item.marketplace_item_id && item.status === 'sold' && (
                          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Synced & Sold
                          </Badge>
                        )}
                        {item.status === 'sold' && item.sale_phase && (
                          <Badge className={`text-xs ${item.sale_phase === 'pre_sale' ? 'bg-blue-100 text-blue-700' : item.sale_phase === 'post_sale' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {item.sale_phase === 'pre_sale' ? 'Pre-Sale' : item.sale_phase === 'post_sale' ? 'Post-Sale' : 'During Sale'}
                          </Badge>
                        )}
                        {item.pre_sale_allowed && item.status !== 'sold' && (
                          <Badge className="bg-blue-50 text-blue-600 text-xs">Pre-Sale OK</Badge>
                        )}
                        {item.post_sale_allowed && item.status !== 'sold' && (
                          <Badge className="bg-purple-50 text-purple-600 text-xs">Post-Sale OK</Badge>
                        )}
                      </div>

                      {item.status === 'sold' && (
                        <div className="mt-3 grid gap-1 text-xs text-slate-600 border-t border-slate-100 pt-2">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {item.buyer_name || 'Buyer not recorded'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            {item.payment_method_used
                              ? `Paid via ${item.payment_method_used.replace('_', ' ')}`
                              : 'No payment recorded'}
                          </span>
                          {item.pickup_location?.instructions && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Pickup: {item.pickup_location.instructions}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            {item.pickup_completed_at
                              ? <><PackageCheck className="w-3.5 h-3.5 text-green-500" /> Picked up</>
                              : <span className="text-amber-600">Awaiting pickup</span>}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">${item.price?.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      {item.sku && <p className="text-xs text-slate-500">SKU: {item.sku}</p>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap justify-end">
                  {item.status !== 'sold' && (
                    <div className="flex flex-col gap-1 text-right">
                      <button
                        onClick={() => handleTogglePrePost(item, 'pre_sale_allowed')}
                        className={`text-xs px-2 py-1 rounded border ${item.pre_sale_allowed ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-slate-200 text-slate-500'}`}
                        title="Toggle pre-sale selling"
                      >
                        {item.pre_sale_allowed ? '✓' : '+'} Pre-Sale
                      </button>
                      <button
                        onClick={() => handleTogglePrePost(item, 'post_sale_allowed')}
                        className={`text-xs px-2 py-1 rounded border ${item.post_sale_allowed ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-slate-200 text-slate-500'}`}
                        title="Toggle post-sale selling"
                      >
                        {item.post_sale_allowed ? '✓' : '+'} Post-Sale
                      </button>
                    </div>
                  )}
                  {item.status !== 'sold' && (
                    <select
                      value={item.status}
                      onChange={e => handleStatusChange(item, e.target.value)}
                      className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    >
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                    </select>
                  )}

                  {(item.inventory_level === 'HIGH_VALUE' || (item.custody_events || []).length > 0) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700"
                      onClick={() => setCustodyItem(item)}
                      title="Custody — controlled location, movements, off-site research"
                    >
                      <Lock className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPricingItem(item)}
                    title="Pricing workspace — evidence, comparables, range, history"
                  >
                    <Scale className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setResearchDialogItem(item)}
                    className={item.research_status && item.research_status !== 'CLEAR' ? 'border-violet-300 text-violet-700' : ''}
                    title="Flag or resolve research"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAttentionDialogItem(item)}
                    className={item.display_attention && item.display_attention !== 'NONE' ? 'border-amber-300 text-amber-700' : ''}
                    title="Set display attention (internal)"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chapter 3 P1 — research-needed flag */}
      {researchDialogItem && (
        <ResearchFlagDialog
          item={researchDialogItem}
          open={!!researchDialogItem}
          onClose={() => setResearchDialogItem(null)}
          onSaved={() => loadData()}
        />
      )}

      {/* Chapter 8 P1 — display attention (internal handling) */}
      {attentionDialogItem && (
        <DisplayAttentionDialog
          item={attentionDialogItem}
          open={!!attentionDialogItem}
          onClose={() => setAttentionDialogItem(null)}
          onSaved={() => loadData()}
        />
      )}

      {/* Chapter 2 P1 — sold details capture */}
      {soldDialogItem && (
        <SoldDetailsDialog
          open={!!soldDialogItem}
          item={soldDialogItem}
          onClose={() => setSoldDialogItem(null)}
          onConfirm={details => applySoldDetails(soldDialogItem, details)}
        />
      )}

      {/* Chapter 15 P1-49/P1-50 — custody continuation for high-value merchandise */}
      {custodyItem && (
        <ItemCustodyDialog
          open={!!custodyItem}
          item={custodyItem}
          sale={sale}
          onClose={() => setCustodyItem(null)}
          onSaved={() => loadData()}
        />
      )}

      {/* Chapter 16 P1-15 — pricing workspace (assembled view, no duplication) */}
      {pricingItem && (
        <PricingWorkspace
          open={!!pricingItem}
          item={pricingItem}
          onClose={() => setPricingItem(null)}
          onSaved={() => loadData()}
        />
      )}

      {/* Chapter 15 P1-9 — operator inventory guidance */}
      <InventoryRulesDialog open={rulesOpen} sale={sale} onClose={() => setRulesOpen(false)} />

      {/* Item Form Modal */}
      {showForm && (
        <UnifiedItemForm
          item={editingItem}
          saleId={saleId}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}