import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit2, Check, X } from 'lucide-react';

const CATEGORIES = [
  'Furniture', 'Art & Collectibles', 'Jewelry', 'Antiques', 
  'Electronics', 'Home Decor', 'Kitchen & Dining', 'Tools & Equipment',
  'Books & Media', 'Clothing & Accessories', 'Outdoor & Garden', 'Other'
];

export default function BulkEditPhotosModal({ open, onClose, selectedImages, images, onApply }) {
  const [priceAdjustment, setPriceAdjustment] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('add'); // add, subtract, set, multiply
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [applyPrice, setApplyPrice] = useState(false);
  const [applyCategories, setApplyCategories] = useState(false);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleApply = () => {
    const updates = {};

    if (applyCategories && selectedCategories.length > 0) {
      updates.categories = selectedCategories;
    }

    if (applyPrice && priceAdjustment && !isNaN(parseFloat(priceAdjustment))) {
      updates.priceAdjustment = {
        type: adjustmentType,
        value: parseFloat(priceAdjustment)
      };
    }

    onApply(updates);
    handleClose();
  };

  const handleClose = () => {
    setPriceAdjustment('');
    setAdjustmentType('add');
    setSelectedCategories([]);
    setApplyPrice(false);
    setApplyCategories(false);
    onClose();
  };

  const selectedPhotos = selectedImages.map(idx => images[idx]).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-orange-600" />
            Bulk Edit Photos ({selectedImages.length} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Selected Photos */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Selected Photos:</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg">
              {selectedPhotos.map((img, idx) => (
                <img 
                  key={idx}
                  src={img.url}
                  alt={img.name || 'Photo'}
                  className="w-16 h-16 object-cover rounded border"
                />
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apply-categories"
                checked={applyCategories}
                onChange={(e) => setApplyCategories(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="apply-categories" className="cursor-pointer font-semibold">
                Apply Categories
              </Label>
            </div>
            {applyCategories && (
              <>
                <p className="text-xs text-slate-600">
                  These categories will be added to all selected photos
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        selectedCategories.includes(category)
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'hover:bg-slate-100'
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Price Adjustment */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apply-price"
                checked={applyPrice}
                onChange={(e) => setApplyPrice(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="apply-price" className="cursor-pointer font-semibold">
                Adjust Prices
              </Label>
            </div>
            {applyPrice && (
              <>
                <p className="text-xs text-slate-600">
                  Apply pricing changes to all selected photos that have prices
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Adjustment Type</Label>
                    <select
                      value={adjustmentType}
                      onChange={(e) => setAdjustmentType(e.target.value)}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="add">Add Amount ($)</option>
                      <option value="subtract">Subtract Amount ($)</option>
                      <option value="set">Set Price ($)</option>
                      <option value="multiply">Multiply by (%)</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">
                      {adjustmentType === 'multiply' ? 'Multiplier (%)' : 'Amount ($)'}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={priceAdjustment}
                      onChange={(e) => setPriceAdjustment(e.target.value)}
                      placeholder={adjustmentType === 'multiply' ? '1.10 for +10%' : '0.00'}
                    />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-slate-700">
                  <strong>Preview:</strong> 
                  {adjustmentType === 'add' && ` Add $${priceAdjustment || 0} to each price`}
                  {adjustmentType === 'subtract' && ` Subtract $${priceAdjustment || 0} from each price`}
                  {adjustmentType === 'set' && ` Set all prices to $${priceAdjustment || 0}`}
                  {adjustmentType === 'multiply' && ` Multiply all prices by ${priceAdjustment || 1}`}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={(!applyCategories && !applyPrice) || 
                       (applyCategories && selectedCategories.length === 0) ||
                       (applyPrice && (!priceAdjustment || isNaN(parseFloat(priceAdjustment))))}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply to {selectedImages.length} Photos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}