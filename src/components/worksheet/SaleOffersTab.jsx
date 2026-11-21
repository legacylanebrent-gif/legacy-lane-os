import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HandCoins, Plus, X, Camera, Check, AlertCircle } from 'lucide-react';
import { getSalePhotoOptions, filterSalePhotoOptions } from './salePhotoOptions';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-slate-100 text-slate-500',
};

export default function SaleOffersTab({ sale }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Field 1 — the item or items the offer is for
  const [items, setItems] = useState([]);
  const [itemInput, setItemInput] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);
  const [photoQuery, setPhotoQuery] = useState('');

  const [offerPrice, setOfferPrice] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const photos = filterSalePhotoOptions(getSalePhotoOptions(sale), photoQuery);

  useEffect(() => {
    if (sale?.id) loadOffers();
  }, [sale?.id]);

  const loadOffers = async () => {
    const data = await base44.entities.Offer.filter({ sale_id: sale.id }, '-created_date', 200);
    setOffers(data || []);
    setLoading(false);
  };

  const addItem = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.some((i) => i.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
    );
  };

  const handleSaveOffer = async () => {
    if (items.length === 0 || !offerPrice || !fullName.trim()) {
      setError('Add at least one item, the offer price, and the person’s name.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await base44.entities.Offer.create({
        sale_id: sale.id,
        operator_id: sale.operator_id,
        item_name: items.join(', '),
        offer_amount: parseFloat(offerPrice),
        full_name: fullName.trim(),
        phone: phone.trim(),
        status: 'pending',
      });
      setItems([]);
      setItemInput('');
      setOfferPrice('');
      setFullName('');
      setPhone('');
      setShowPhotos(false);
      setPhotoQuery('');
      await loadOffers();
    } catch (e) {
      setError('Could not save this offer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HandCoins className="w-5 h-5 text-amber-600" />
            Record an Offer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Field 1 — item or items */}
          <div>
            <Label>Item or Items <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Input
                placeholder="Item name..."
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem(itemInput);
                    setItemInput('');
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0 bg-slate-900 hover:bg-slate-800"
                onClick={() => { addItem(itemInput); setItemInput(''); }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`mt-2 w-full ${showPhotos ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'text-cyan-700 border-cyan-600'}`}
              onClick={() => setShowPhotos(!showPhotos)}
            >
              <Camera className="w-4 h-4 mr-2" />
              {showPhotos ? 'Hide Photos' : 'Pull from Photos'}
            </Button>

            {showPhotos && (
              <div className="mt-3 border border-cyan-200 rounded-lg bg-cyan-50 p-3 space-y-3">
                <Input
                  placeholder="Search photos (or leave blank to see all)"
                  value={photoQuery}
                  onChange={(e) => setPhotoQuery(e.target.value)}
                />
                {photos.length === 0 ? (
                  <p className="text-sm text-slate-600">No photos on this sale yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                    {photos.map((photo) => (
                      <button
                        key={photo.key}
                        type="button"
                        onClick={() => addItem(photo.name)}
                        className="flex flex-col items-center p-2 bg-white border border-cyan-100 rounded-lg hover:border-cyan-400"
                      >
                        <img src={photo.imageUrl} alt={photo.name} className="w-full h-20 object-cover rounded mb-1" />
                        <span className="text-xs text-slate-900 text-center line-clamp-2">{photo.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {items.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {items.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-sm px-3 py-1 rounded-full">
                    {item}
                    <button type="button" onClick={() => setItems(items.filter((i) => i !== item))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Field 2 — offer price */}
          <div>
            <Label>Offer Price <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
            />
          </div>

          {/* Field 3 — name */}
          <div>
            <Label>Name of Person <span className="text-red-500">*</span></Label>
            <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          {/* Field 4 — phone */}
          <div>
            <Label>Phone Number</Label>
            <Input type="tel" placeholder="(555) 555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleSaveOffer}
            disabled={saving}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Offer'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Offers on This Sale ({offers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading offers...</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-slate-500">No offers recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer.id} className="p-4 border rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">{offer.item_name}</p>
                    <Badge className={STATUS_STYLES[offer.status] || STATUS_STYLES.pending}>
                      {offer.status}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-green-600">${(offer.offer_amount || 0).toFixed(2)}</p>
                  <p className="text-sm text-slate-700 flex items-center gap-1">
                    <Check className="w-3 h-3 text-slate-400" />
                    {offer.full_name}
                  </p>
                  {offer.phone && <p className="text-sm text-slate-600">{offer.phone}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}