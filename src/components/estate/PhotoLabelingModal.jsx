import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, X, Package } from 'lucide-react';

export default function PhotoLabelingModal({ open, onClose, image, imageIndex, saleId, onApprove }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedNewPrice, setEditedNewPrice] = useState('');
  const [editedUsedPrice, setEditedUsedPrice] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  React.useEffect(() => {
    if (open && image && !suggestions) {
      analyzePhoto();
    }
  }, [open, image]);

  const analyzePhoto = async () => {
    setAnalyzing(true);
    try {
      // Handle different image URL formats
      let imageUrl = image.url;
      if (typeof imageUrl === 'object' && imageUrl.url) {
        imageUrl = imageUrl.url;
      }
      if (typeof image === 'string') {
        imageUrl = image;
      }

      const prompt = `You are analyzing a photo from an estate sale to help label and price items.

Look at this estate sale photo and provide:
1. A clear, concise name for the item (3-5 words max)
2. A brief description (1-2 sentences about condition, style, features)
3. Two realistic price estimates:
   - New price: What this item would cost brand new in a store
   - Used price: A realistic estate sale price based on condition

Be specific and practical. Focus on the main item in the photo.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [imageUrl],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            new_price: { type: "number", description: "Estimated retail price if brand new" },
            used_price: { type: "number", description: "Realistic estate sale price" },
            suggested_categories: { 
              type: "array",
              items: { type: "string" },
              description: "Relevant categories from: Furniture, Art & Collectibles, Jewelry, Antiques, Electronics, Home Decor, Kitchen & Dining, Tools & Equipment, Books & Media, Clothing & Accessories, Outdoor & Garden, Other"
            }
          }
        }
      });

      setSuggestions(result);
      setEditedName(result.name || '');
      setEditedNewPrice(result.new_price?.toString() || '');
      setEditedUsedPrice(result.used_price?.toString() || '');
      setEditedDescription(result.description || '');
      setSelectedCategories(result.suggested_categories || []);
    } catch (error) {
      console.error('Error analyzing photo:', error);
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to analyze photo: ${errorMsg}. Please try again.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveLabel = async () => {
    try {
      // Save to product database
      let imageUrl = image.url;
      if (typeof imageUrl === 'object' && imageUrl.url) {
        imageUrl = imageUrl.url;
      }
      if (typeof image === 'string') {
        imageUrl = image;
      }

      // Check if entry already exists for this image
      const existingEntries = await base44.entities.ProductDatabase.filter({
        thumbnail_url: imageUrl,
        sale_id: saleId
      });

      if (existingEntries.length > 0) {
        // Update existing entry with edited values
        await base44.entities.ProductDatabase.update(existingEntries[0].id, {
          title: editedName,
          description: editedDescription,
          suggested_new_price: editedNewPrice ? parseFloat(editedNewPrice) : null,
          suggested_used_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          actual_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          categories: selectedCategories
        });
      } else {
        // Create new entry
        await base44.entities.ProductDatabase.create({
          thumbnail_url: imageUrl,
          title: editedName,
          description: editedDescription,
          suggested_new_price: editedNewPrice ? parseFloat(editedNewPrice) : null,
          suggested_used_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          actual_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          sale_id: saleId,
          categories: selectedCategories
        });
      }

      onApprove(imageIndex, {
        name: editedName,
        description: editedDescription,
        price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
        categories: selectedCategories
      }, false);
      resetAndClose();
    } catch (error) {
      console.error('Error saving to product database:', error);
      // Still approve the label even if database save fails
      onApprove(imageIndex, {
        name: editedName,
        description: editedDescription,
        price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
        categories: selectedCategories
      }, false);
      resetAndClose();
    }
  };

  const handleApproveAndCreateItem = async () => {
    try {
      // Handle different image URL formats
      let imageUrl = image.url;
      if (typeof imageUrl === 'object' && imageUrl.url) {
        imageUrl = imageUrl.url;
      }
      if (typeof image === 'string') {
        imageUrl = image;
      }

      // Create inventory item
      const createdItem = await base44.entities.Item.create({
        title: editedName,
        description: editedDescription,
        price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
        estate_sale_id: saleId,
        seller_id: (await base44.auth.me()).id,
        images: [imageUrl],
        status: 'available',
        category: selectedCategories[0] || 'estate_items',
        condition: 'good',
        tags: selectedCategories
      });

      // Check if entry already exists for this image
      const existingEntries = await base44.entities.ProductDatabase.filter({
        thumbnail_url: imageUrl,
        sale_id: saleId
      });

      if (existingEntries.length > 0) {
        // Update existing entry with edited values and item_id
        await base44.entities.ProductDatabase.update(existingEntries[0].id, {
          title: editedName,
          description: editedDescription,
          suggested_new_price: editedNewPrice ? parseFloat(editedNewPrice) : null,
          suggested_used_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          actual_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          item_id: createdItem.id,
          categories: selectedCategories
        });
      } else {
        // Create new entry with item_id
        await base44.entities.ProductDatabase.create({
          thumbnail_url: imageUrl,
          title: editedName,
          description: editedDescription,
          suggested_new_price: editedNewPrice ? parseFloat(editedNewPrice) : null,
          suggested_used_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          actual_price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          item_id: createdItem.id,
          sale_id: saleId,
          categories: selectedCategories
        });
        }

        onApprove(imageIndex, {
          name: editedName,
          description: editedDescription,
          price: editedUsedPrice ? parseFloat(editedUsedPrice) : null,
          categories: selectedCategories
        }, true);

        // Auto-close after 2 seconds
        setTimeout(() => {
          resetAndClose();
        }, 2000);
        } catch (error) {
        console.error('Error creating item:', error);
        alert('Failed to create inventory item');
        }
        };

  const resetAndClose = () => {
    setSuggestions(null);
    setEditedName('');
    setEditedNewPrice('');
    setEditedUsedPrice('');
    setEditedDescription('');
    setSelectedCategories([]);
    onClose();
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const CATEGORIES = [
    'Furniture', 'Art & Collectibles', 'Jewelry', 'Antiques', 
    'Electronics', 'Home Decor', 'Kitchen & Dining', 'Tools & Equipment',
    'Books & Media', 'Clothing & Accessories', 'Outdoor & Garden', 'Other'
  ];

  if (!image) return null;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Photo Labeling
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Display */}
          <div className="relative flex justify-center">
            <img
              src={typeof image.url === 'string' ? image.url : (image.url?.url || image)}
              alt="Item photo"
              className="object-contain bg-slate-100 rounded-lg"
              style={{ transform: `rotate(${image.rotation || 0}deg)`, maxWidth: '20%', maxHeight: '200px' }}
            />
          </div>

          {analyzing ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4" />
              <p className="text-slate-600">Analyzing photo with AI...</p>
            </div>
          ) : suggestions ? (
            <>
              {/* AI Suggestions */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">AI Price Suggestions</span>
                </div>
                <div className="grid gap-2 text-sm">
                  {suggestions.new_price && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-green-50">New Price</Badge>
                      <span className="text-slate-600 font-semibold">
                        ${suggestions.new_price.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {suggestions.used_price && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-orange-50">Estate Sale Price</Badge>
                      <span className="text-slate-600 font-semibold">
                        ${suggestions.used_price.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter item name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>New Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedNewPrice}
                      onChange={(e) => setEditedNewPrice(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      Retail price when new
                    </p>
                  </div>
                  <div>
                    <Label>Estate Sale Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editedUsedPrice}
                      onChange={(e) => setEditedUsedPrice(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      Your sale price
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Item description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Categories</Label>
                  {suggestions?.suggested_categories && suggestions.suggested_categories.length > 0 && (
                    <p className="text-xs text-purple-600 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI suggested: {suggestions.suggested_categories.join(', ')}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.map(category => (
                      <Badge
                        key={category}
                        variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          selectedCategories.includes(category)
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'hover:bg-slate-100'
                        }`}
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetAndClose}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleApproveLabel}
                  disabled={!editedName}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Label Only
                </Button>
                <Button
                  onClick={handleApproveAndCreateItem}
                  disabled={!editedName}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Label + Add to Inventory
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500">
                Choose "Label Only" to just add a label to the photo, or "Label + Add to Inventory" to create an inventory item
              </p>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}