import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Store, ShoppingCart } from 'lucide-react';
import CategoryFields from './CategoryFields';
import SmartAuctionScheduler from './SmartAuctionScheduler';

const CATEGORIES = [
  'antiques', 'art', 'artwork_prints_posters', 'books_media',
  'china_porcelain', 'clocks_watches', 'clothing_accessories', 'coins_currency',
  'collectibles', 'craft_sewing', 'electronics', 'furniture',
  'garden_outdoor', 'glassware_crystal', 'holiday_seasonal',
  'home_decor', 'kitchen_dining', 'lighting_lamps',
  'medical_mobility', 'musical_instruments', 'office_business', 'rugs_textiles',
  'sporting_goods', 'tools_hardware', 'toys_games', 'vehicles', 'other'
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used_like_new', label: 'Used - Like New' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'for_parts', label: 'For Parts or Not Working' },
];

const AUCTION_TYPES = [
  { value: 'SIMPLE', label: 'Simple — Highest bid wins' },
  { value: 'AUTO_BID', label: 'Auto-Bid — Proxy bidding up to a max' },
  { value: 'SEALED_BID', label: 'Sealed Bid — Bids hidden until close' },
];

const SHIPPING_OPTIONS = [
  { value: 'BOTH', label: 'Shipping & Local Pickup' },
  { value: 'SHIPS_ONLY', label: 'Ships Only' },
  { value: 'LOCAL_PICKUP_ONLY', label: 'Local Pickup Only' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'furniture',
  condition: 'used_good',
  price: '',
  quantity: 1,
  // Listing type
  listing_type: 'for_sale',
  // Auction fields
  auction_type: 'SIMPLE',
  reserve_price: '',
  auction_start_date: '',
  auction_end_date: '',
  // Fulfillment / Shipping
  shipping_option: 'BOTH',
  shipping_cost: 0,
  pickup_location_address: '',
  pickup_location_zip: '',
  // Sales channels
  sales_channels: ['inventory'],
};

export default function CreateItemModal({ open, onClose, onSuccess, item, saleId }) {
  const [loading, setLoading] = useState(false);
  const [categorySpecs, setCategorySpecs] = useState({});
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const PAYMENT_OPTIONS = [
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'credit_card', label: 'Credit/Debit Card' },
    { value: 'venmo', label: 'Venmo' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'cashapp', label: 'Cash App' },
    { value: 'stripe', label: 'Stripe' },
    { value: 'square', label: 'Square' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'furniture',
        condition: item.condition || 'used_good',
        price: item.price || '',
        quantity: item.quantity || 1,
        listing_type: item.listing_type || 'for_sale',
        auction_type: item.auction_type || 'SIMPLE',
        reserve_price: item.reserve_price || '',
        auction_start_date: item.auction_start_date || '',
        auction_end_date: item.auction_end_date || '',
        shipping_option: item.shipping_option || 'BOTH',
        shipping_cost: item.shipping_cost || 0,
        pickup_location_address: item.pickup_location?.address || '',
        pickup_location_zip: item.pickup_location?.zip || '',
        sales_channels: item.sales_channels || ['inventory'],
        payment_methods_accepted: item.payment_methods_accepted || [],
        payment_notes: item.payment_notes || '',
      });
      setImages(item.images || []);
      setCategorySpecs(item.category_specs || {});
    } else {
      setFormData({ ...EMPTY_FORM });
      setImages([]);
      setCategorySpecs({});
    }
  }, [item, open]);

  const handleImageFiles = async (files) => {
    setUploadingImages(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setImages(prev => [...prev, ...uploaded]);
    setUploadingImages(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length) handleImageFiles(files);
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleChannel = (channel) => {
    const current = formData.sales_channels || [];
    // 'inventory' is always required — cannot be removed
    if (channel === 'inventory') return;
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    setFormData({ ...formData, sales_channels: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await base44.auth.me();

      const itemPayload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: formData.quantity,
        listing_type: formData.listing_type,
        auction_type: formData.listing_type === 'auction' ? formData.auction_type : null,
        reserve_price: formData.listing_type === 'auction' && formData.reserve_price ? parseFloat(formData.reserve_price) : null,
        auction_start_date: formData.listing_type === 'auction' ? formData.auction_start_date : null,
        auction_end_date: formData.listing_type === 'auction' ? formData.auction_end_date : null,
        shipping_option: formData.shipping_option,
        shipping_cost: formData.shipping_cost || 0,
        payment_methods_accepted: formData.payment_methods_accepted || [],
        payment_notes: formData.payment_notes || '',
        pickup_location: (formData.shipping_option !== 'SHIPS_ONLY') ? {
          address: formData.pickup_location_address,
          zip: formData.pickup_location_zip,
        } : null,
        sales_channels: formData.sales_channels,
        images,
        category_specs: categorySpecs,
      };

      let savedItemId;
      if (item) {
        await base44.entities.Item.update(item.id, itemPayload);
        savedItemId = item.id;
      } else {
        const created = await base44.entities.Item.create({
          ...itemPayload,
          seller_id: user.id,
          seller_name: user.full_name,
          estate_sale_id: saleId || null,
          status: 'available',
        });
        savedItemId = created.id;
      }

      // If marketplace channel is selected, sync to MarketplaceItem
      if (formData.sales_channels.includes('marketplace') && savedItemId) {
        const existingMI = await base44.entities.MarketplaceItem.filter({ item_id: savedItemId });
        const miPayload = {
          item_id: savedItemId,
          operator_id: user.id,
          estate_sale_id: saleId || null,
          listing_type: formData.listing_type === 'auction' ? 'AUCTION' : 'FOR_SALE',
          price: parseFloat(formData.price),
          reserve_price: formData.listing_type === 'auction' && formData.reserve_price ? parseFloat(formData.reserve_price) : null,
          auction_type: formData.listing_type === 'auction' ? formData.auction_type : null,
          auction_start_date: formData.listing_type === 'auction' ? formData.auction_start_date : null,
          auction_end_date: formData.listing_type === 'auction' ? formData.auction_end_date : null,
          shipping_option: formData.shipping_option,
          shipping_cost: formData.shipping_cost || 0,
          pickup_location_address: formData.pickup_location_address,
          pickup_location_zip: formData.pickup_location_zip,
          status: formData.listing_type === 'auction' ? 'ACTIVE' : 'ACTIVE',
        };
        if (existingMI.length > 0) {
          await base44.entities.MarketplaceItem.update(existingMI[0].id, miPayload);
        } else {
          await base44.entities.MarketplaceItem.create(miPayload);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onMarketplace = formData.sales_channels?.includes('marketplace');
  const isAuction = formData.listing_type === 'auction';
  const showPickup = formData.shipping_option !== 'SHIPS_ONLY';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-navy-900">
            {item ? 'Edit Listing' : 'Create New Listing'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Sales Channels */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Publish To</p>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <Store className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Inventory</p>
                  <p className="text-xs text-slate-500">Always included</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700">Active</Badge>
              </div>
              <button
                type="button"
                onClick={() => toggleChannel('marketplace')}
                className={`flex-1 flex items-center gap-3 p-3 border rounded-lg transition-all ${onMarketplace ? 'bg-cyan-50 border-cyan-400' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
              >
                <ShoppingCart className={`w-5 h-5 ${onMarketplace ? 'text-cyan-600' : 'text-slate-400'}`} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Marketplace</p>
                  <p className="text-xs text-slate-500">Public listing</p>
                </div>
                {onMarketplace && <Badge className="bg-cyan-100 text-cyan-700">Active</Badge>}
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Item title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your item..."
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label className="mb-2 block">Photos</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => handleImageFiles(e.target.files)} />
              {uploadingImages ? (
                <p className="text-sm text-slate-500">Uploading...</p>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Drag & drop or <span className="text-orange-600 font-medium">click to upload</span></p>
                  <p className="text-xs text-slate-400 mt-1">Multiple images supported</p>
                </>
              )}
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                    <button type="button" onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">Main</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition *</Label>
              <Select value={formData.condition} onValueChange={(val) => setFormData({...formData, condition: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category-specific fields */}
          <CategoryFields category={formData.category} specs={categorySpecs} onChange={setCategorySpecs} />

          {/* Listing Type */}
          <div>
            <Label className="mb-2 block">Listing Type</Label>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setFormData({...formData, listing_type: 'for_sale'})}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${!isAuction ? 'bg-orange-600 text-white border-orange-600' : 'border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                Fixed Price
              </button>
              <button type="button"
                onClick={() => setFormData({...formData, listing_type: 'auction'})}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${isAuction ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-600 hover:border-purple-300'}`}>
                Auction
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">{isAuction ? 'Starting Bid *' : 'Price *'}</Label>
              <Input id="price" type="number" step="0.01" value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00" required />
            </div>
            {isAuction ? (
              <div>
                <Label htmlFor="reserve_price">Reserve Price (optional)</Label>
                <Input id="reserve_price" type="number" step="0.01" value={formData.reserve_price}
                  onChange={(e) => setFormData({...formData, reserve_price: e.target.value})}
                  placeholder="Minimum to sell" />
              </div>
            ) : (
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" value={formData.quantity} min="1"
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})} />
              </div>
            )}
          </div>

          {/* Auction-specific */}
          {isAuction && (
            <>
              <div>
                <Label>Auction Type</Label>
                <Select value={formData.auction_type} onValueChange={(val) => setFormData({...formData, auction_type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUCTION_TYPES.map(at => <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <SmartAuctionScheduler
                category={formData.category}
                title={formData.title}
                price={formData.price}
                condition={formData.condition}
                onScheduleSet={(schedule) => setFormData({ ...formData, ...schedule })}
              />
            </>
          )}

          {/* Shipping / Fulfillment */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-4">
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fulfillment</p>

            <div>
              <Label>Shipping Option</Label>
              <Select value={formData.shipping_option} onValueChange={(val) => setFormData({...formData, shipping_option: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIPPING_OPTIONS.map(so => <SelectItem key={so.value} value={so.value}>{so.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {formData.shipping_option !== 'LOCAL_PICKUP_ONLY' && (
              <div>
                <Label htmlFor="shipping_cost">Shipping Cost ($)</Label>
                <Input id="shipping_cost" type="number" step="0.01" value={formData.shipping_cost}
                  onChange={(e) => setFormData({...formData, shipping_cost: parseFloat(e.target.value)})}
                  placeholder="0.00 for free shipping" />
              </div>
            )}

            {showPickup && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="pickup_address">Pickup Address</Label>
                  <Input id="pickup_address" value={formData.pickup_location_address}
                    onChange={(e) => setFormData({...formData, pickup_location_address: e.target.value})}
                    placeholder="Street address" />
                </div>
                <div>
                  <Label htmlFor="pickup_zip">ZIP Code</Label>
                  <Input id="pickup_zip" value={formData.pickup_location_zip}
                    onChange={(e) => setFormData({...formData, pickup_location_zip: e.target.value})}
                    placeholder="00000" />
                </div>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Payment Methods Accepted</p>
            <p className="text-xs text-slate-500">Leave blank to use your default operator payment settings.</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={(formData.payment_methods_accepted || []).includes(opt.value)}
                    onCheckedChange={() => {
                      const current = formData.payment_methods_accepted || [];
                      const updated = current.includes(opt.value)
                        ? current.filter(v => v !== opt.value)
                        : [...current, opt.value];
                      setFormData({ ...formData, payment_methods_accepted: updated });
                    }}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            <div>
              <Label htmlFor="payment_notes" className="text-xs text-slate-600">Payment Notes (optional)</Label>
              <Input
                id="payment_notes"
                value={formData.payment_notes || ''}
                onChange={e => setFormData({ ...formData, payment_notes: e.target.value })}
                placeholder="e.g. Cash only at pickup, Venmo preferred"
                className="text-sm mt-1"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
              {loading ? 'Saving...' : (item ? 'Update Listing' : 'Create Listing')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}