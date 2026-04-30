import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Plus, X, QrCode } from 'lucide-react';

export default function TransactionForm({
  photoMode, setPhotoMode,
  bundleMode, setBundleMode,
  itemName, setItemName,
  quantity, setQuantity,
  price, setPrice,
  paymentMethod, setPaymentMethod,
  notes, setNotes,
  currentTotal,
  submitting,
  handleAddTransaction,
  handleSaveBundle,
  bundleName, setBundleName,
  bundleItems, bundleItemInput, setBundleItemInput,
  bundleItemPrice, setBundleItemPrice,
  bundlePrice, setBundlePrice,
  addBundleItem, removeBundleItem,
  photoSearchQuery, handlePhotoSearch,
  searchingPhotos, photoSuggestions,
  selectedPhoto, setSelectedPhoto,
  selectPhotoItem,
  onScanCart,
}) {
  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            {bundleMode ? 'Bundle Transaction' : photoMode ? 'Add from Photos' : 'Add New Transaction'}
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onScanCart}
              className="whitespace-nowrap text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Cart
            </Button>
            <Button
              variant={photoMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setPhotoMode(!photoMode);
                setBundleMode(false);
                if (!photoMode) {
                  setItemName('');
                  setPrice('');
                  setSelectedPhoto(null);
                }
              }}
              className={`whitespace-nowrap ${photoMode ? 'bg-cyan-600 hover:bg-cyan-700' : ''}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              {photoMode ? 'Photo Mode' : 'From Photos'}
            </Button>
            <Button
              variant={bundleMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setBundleMode(!bundleMode);
                setPhotoMode(false);
              }}
              className={`whitespace-nowrap ${bundleMode ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              {bundleMode ? 'Bundle Mode' : 'Create Bundle'}
            </Button>
          </div>
        </div>

        {photoMode ? (
          <div className="space-y-4 border-2 border-cyan-200 rounded-lg p-4 bg-cyan-50">
            <div>
              <Label>Search Items from Photos <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  placeholder="Start typing item name... (e.g., 'dining table', 'vase')"
                  value={photoSearchQuery}
                  onChange={(e) => handlePhotoSearch(e.target.value)}
                  className="pr-10"
                />
                {searchingPhotos && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-cyan-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>

              {photoSuggestions.length > 0 && (
                <div className="mt-2 border border-cyan-300 rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
                  {photoSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectPhotoItem(suggestion)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-cyan-50 border-b last:border-b-0 text-left"
                    >
                      {suggestion.imageUrl && (
                        <img
                          src={typeof suggestion.imageUrl === 'string' ? suggestion.imageUrl : suggestion.imageUrl.url}
                          alt={suggestion.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{suggestion.name}</div>
                        {suggestion.description && <div className="text-sm text-slate-600 line-clamp-2">{suggestion.description}</div>}
                        {suggestion.suggested_price && (
                          <div className="text-sm font-semibold text-green-600 mt-1">Suggested: ${suggestion.suggested_price.toFixed(2)}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedPhoto && (
                <div className="mt-3 p-3 bg-white border border-cyan-300 rounded-lg flex items-center gap-3">
                  {selectedPhoto.imageUrl && (
                    <img
                      src={typeof selectedPhoto.imageUrl === 'string' ? selectedPhoto.imageUrl : selectedPhoto.imageUrl.url}
                      alt={selectedPhoto.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">Selected: {selectedPhoto.name}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedPhoto(null); setItemName(''); setPrice(''); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>Item Name <span className="text-red-500">*</span></Label>
              <Input placeholder="Item name (auto-filled from photo)" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Payment <span className="text-red-500">*</span></Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Price <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00 (auto-filled or override)" value={price} onChange={(e) => setPrice(e.target.value)} />
              <p className="text-xs text-slate-600 mt-1">Price auto-filled from photo metadata, or enter your own</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${currentTotal.toFixed(2)}</span>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button onClick={handleAddTransaction} disabled={submitting} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              {submitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        ) : bundleMode ? (
          <div className="space-y-4 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <div>
              <Label>Bundle Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g., Kitchen Bundle, Living Room Set..." value={bundleName} onChange={(e) => setBundleName(e.target.value)} />
            </div>

            <div>
              <Label>Add Items to Bundle</Label>
              <div className="flex gap-2">
                <Input placeholder="Item name..." value={bundleItemInput} onChange={(e) => setBundleItemInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addBundleItem()} className="flex-1" />
                <Input type="number" step="0.01" min="0" placeholder="Price" value={bundleItemPrice} onChange={(e) => setBundleItemPrice(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addBundleItem()} className="w-32" />
                <Button type="button" onClick={addBundleItem} size="icon" className="bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4" /></Button>
              </div>
              {bundleItems.length > 0 && (
                <div className="mt-2 space-y-1">
                  {bundleItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-semibold text-green-600">${item.price.toFixed(2)}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeBundleItem(index)} className="h-6 w-6 p-0"><X className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Bundle Price <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} className="font-semibold text-lg" />
              <p className="text-xs text-slate-600 mt-1">Auto-calculated from items, or enter manually</p>
            </div>

            <div>
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveBundle} disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              {submitting ? 'Saving...' : 'Save Bundle'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item <span className="text-red-500">*</span></label>
              <Input placeholder="Item name..." value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment <span className="text-red-500">*</span></label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price <span className="text-red-500">*</span></label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>

            <div className="bg-slate-50 p-4 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-2xl font-bold text-slate-900">${currentTotal.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <Input placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button onClick={handleAddTransaction} disabled={submitting} className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold">
              <Plus className="w-5 h-5 mr-2" />
              {submitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}