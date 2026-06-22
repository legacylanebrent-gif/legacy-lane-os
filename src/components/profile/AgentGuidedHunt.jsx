import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, ArrowRight, Search, Check, Plus, Loader2,
  ShoppingBag, ChevronRight, RotateCcw, X, ListFilter,
  Image as ImageIcon, Upload
} from 'lucide-react';

const CATEGORIES = [
  'Antiques', 'Art', 'Books & Media', 'Cameras & Photography',
  'China & Porcelain', 'Clothing & Accessories', 'Coins & Currency',
  'Collectibles', 'Comics', 'Electronics', 'Firearms', 'Furniture',
  'Garden & Outdoor', 'Glassware', 'Holiday & Seasonal', 'Jewelry',
  'Kitchen & Dining', 'Lighting & Lamps', 'Mid-Century Modern',
  'Musical Instruments', 'Other', 'Rugs & Textiles', 'Sporting Goods',
  'Tools & Hardware', 'Toys & Games', 'Vehicles', 'Victorian Era',
  'Vinyl Records', 'Vintage Fashion', 'Watches'
];

const STEPS = ['category', 'search', 'results'];

export default function AgentGuidedHunt({ user, onItemsAdded }) {
  const [step, setStep] = useState('category');
  const [category, setCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customItems, setCustomItems] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const addCustomItem = () => {
    const title = customTitle.trim();
    if (!title) return;
    setCustomItems(prev => [...prev, { title, description: '', brand: '', subcategory: '', era: '', estimated_value_min: null, estimated_value_max: null, isCustom: true }]);
    setCustomTitle('');
  };

  const removeCustomItem = (idx) => {
    setCustomItems(prev => prev.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setStep('category');
    setCategory('');
    setSearchQuery('');
    setResults(null);
    setSelectedItems(new Set());
    setCustomItems([]);
    setCustomTitle('');
    setError('');
    setUploadedImage(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const response = await base44.functions.invoke('generateItemList', {
        category,
        query: searchQuery.trim(),
      });
      setResults(response.data);
      setStep('results');
    } catch (e) {
      setError('Could not generate items. Please try again.');
      console.error('generateItemList error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const toggleItem = (idx) => {
    const next = new Set(selectedItems);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedItems(next);
  };

  const toggleAll = () => {
    if (!results?.items) return;
    if (selectedItems.size === results.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(results.items.map((_, i) => i)));
    }
  };

  const handleSaveSelected = async () => {
    if (selectedItems.size === 0 && customItems.length === 0) return;
    setSaving(true);
    try {
      const llmItems = Array.from(selectedItems).map(idx => {
        const item = results.items[idx];
        return {
          buyer_id: user.id,
          buyer_name: user.full_name || user.email,
          title: item.title,
          description: item.description || '',
          brand: item.brand || '',
          category: category,
          subcategory: item.subcategory || '',
          era: item.era || '',
          budget_min: item.estimated_value_min || null,
          budget_max: item.estimated_value_max || null,
          condition: 'any',
          shipping_ok: true,
          public_visibility: true,
          status: 'active',
        };
      });

      const manualItems = customItems.map(item => ({
        buyer_id: user.id,
        buyer_name: user.full_name || user.email,
        title: item.title,
        description: item.description || '',
        brand: item.brand || '',
        category: category,
        subcategory: item.subcategory || '',
        era: item.era || '',
        budget_min: item.estimated_value_min || null,
        budget_max: item.estimated_value_max || null,
        condition: 'any',
        shipping_ok: true,
        public_visibility: true,
        status: 'active',
      }));

      const itemsToSave = [...llmItems, ...manualItems];
      if (itemsToSave.length > 0) {
        await base44.entities.WantedItem.bulkCreate(itemsToSave);
      }
      if (onItemsAdded) onItemsAdded();
      reset();
    } catch (e) {
      console.error('Error saving items:', e);
      setError('Could not save items. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-orange-500" />
          AI guided item hunter
        </CardTitle>
        <p className="text-xs text-slate-500">
          Pick a category, name what you're after, and we'll generate a complete hunt list
        </p>
      </CardHeader>
      <CardContent>
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                i < stepIndex ? 'bg-green-100 text-green-700' :
                i === stepIndex ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-400'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  i < stepIndex ? 'bg-green-500 text-white' :
                  i === stepIndex ? 'bg-orange-500 text-white' :
                  'bg-slate-300 text-white'
                }`}>
                  {i < stepIndex ? <Check className="w-2.5 h-2.5" /> : i + 1}
                </span>
                {s === 'category' ? 'Category' : s === 'search' ? 'Search' : 'Select'}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Category */}
        {step === 'category' && (
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label className="text-sm mb-2 block">Upload a Photo (Optional)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                {uploadedImage ? (
                  <div className="space-y-3">
                    <div className="relative flex items-center justify-center bg-white rounded-lg border border-slate-200 p-2">
                      <img src={uploadedImage} alt="Uploaded item" className="max-w-full max-h-40 w-auto h-auto object-contain rounded" />
                      <button
                        type="button"
                        onClick={() => { setUploadedImage(null); setCategory(''); setSearchQuery(''); setError(''); }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-sm"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {analyzingImage && (
                      <div className="flex items-center justify-center gap-2 text-sm text-purple-700">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your image...
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-3" />
                      )}
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        {uploadingImage ? 'Uploading...' : 'Upload a photo of what you\'re hunting for'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Our AI will analyze it and suggest the category and search terms
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setUploadingImage(true);
                        setError('');
                        try {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file });
                          setUploadedImage(file_url);
                          console.log('Image uploaded:', file_url);
                          
                          // Auto-analyze the uploaded image
                          setAnalyzingImage(true);
                          const response = await base44.integrations.Core.InvokeLLM({
                            prompt: `Look at this image and identify what category it belongs to from this list: ${CATEGORIES.join(', ')}. Then provide a specific search query to find similar items (include brand, style, era, or type if visible). Return ONLY valid JSON with this exact format: {"category": "ExactCategoryName", "searchQuery": "specific search terms"}. Example: {"category": "Cameras & Photography", "searchQuery": "vintage medium format camera"}`,
                            file_urls: [file_url],
                            response_json_schema: {
                              type: 'object',
                              properties: {
                                category: { type: 'string', description: 'Category from the list' },
                                searchQuery: { type: 'string', description: 'Specific search query' },
                              },
                              required: ['category', 'searchQuery'],
                            },
                          });
                          console.log('AI Analysis response:', response.data);
                          const analysis = response.data;
                          if (analysis && analysis.category) {
                            setCategory(analysis.category);
                            if (analysis.searchQuery) {
                              setSearchQuery(analysis.searchQuery);
                            }
                            console.log('Analysis successful:', { category: analysis.category, searchQuery: analysis.searchQuery });
                          } else {
                            console.error('Invalid analysis response:', analysis);
                            setError('Could not analyze image. Please select category manually.');
                          }
                        } catch (err) {
                          console.error('Upload or analysis error:', err);
                          setError('Could not analyze image. Please select category manually.');
                        } finally {
                          setUploadingImage(false);
                          setAnalyzingImage(false);
                        }
                      }}
                      disabled={uploadingImage || analyzingImage}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Show analysis results after analysis */}
            {uploadedImage && category && searchQuery && (
              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 mb-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">AI Analysis Complete!</p>
                    <p className="text-xs text-green-700 mt-1">
                      We detected: <span className="font-medium">{category}</span> — "{searchQuery}"
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-xs h-8 flex-1"
                    onClick={() => setStep('search')}
                  >
                    Continue to Step 2 <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-green-300 text-green-700 hover:bg-green-100 flex-1"
                    onClick={() => {
                      setCategory('');
                      setSearchQuery('');
                    }}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              <ImageIcon className="w-3 h-3 inline mr-1" />
              One image at a time for AI analysis
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or select manually</span>
              </div>
            </div>

            <div>
              <Label className="text-sm">What are you hunting for?</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a category..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-orange-600 hover:bg-orange-700 w-full"
              disabled={!category}
              onClick={() => setStep('search')}
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Search query */}
        {step === 'search' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">
                Describe what you're looking for in <span className="font-semibold text-orange-700">{category}</span>
              </Label>
              <p className="text-xs text-slate-400 mt-1 mb-2">
                Be specific — an artist, brand, designer, style, or type of item
              </p>
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`e.g., "Elvis", "Herman Miller", "Art Deco lamps", "Chinese porcelain"`}
                className="mt-1"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('category')} className="flex-1">
                Back
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 flex-1"
                disabled={!searchQuery.trim() || generating}
                onClick={handleSearch}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Finding items...</>
                ) : (
                  <><Search className="w-4 h-4 mr-1" /> Find Items</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && results && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  Found {results.items?.length || 0} items for "{searchQuery}"
                </h3>
                <p className="text-xs text-slate-500">
                  Check the ones you want to hunt for
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
                  {selectedItems.size === results.items?.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  {selectedItems.size + customItems.length} selected
                </Badge>
              </div>
            </div>

            {/* Items grid */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {results.items?.map((item, idx) => {
                const isSelected = selectedItems.has(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleItem(idx)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-orange-200'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {item.brand && (
                          <Badge variant="secondary" className="text-[10px]">{item.brand}</Badge>
                        )}
                        {item.subcategory && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{item.subcategory}</Badge>
                        )}
                        {item.era && (
                          <Badge variant="outline" className="text-[10px]">{item.era}</Badge>
                        )}
                        {(item.estimated_value_min || item.estimated_value_max) && (
                          <span className="text-[10px] text-green-600 font-medium">
                            ${item.estimated_value_min || 0}–${item.estimated_value_max || '?'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom item entry */}
            <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300">
              <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Not finding what you want? Add your own:
              </p>
              <div className="flex gap-2">
                <Input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Enter an exact item title..."
                  className="text-sm h-9"
                  onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-orange-300 text-orange-700 hover:bg-orange-50 flex-shrink-0"
                  onClick={addCustomItem}
                  disabled={!customTitle.trim()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              {customItems.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {customItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded bg-orange-50 border border-orange-200 text-sm">
                      <ShoppingBag className="w-3 h-3 text-orange-500 flex-shrink-0" />
                      <span className="flex-1 text-slate-700 truncate">{item.title}</span>
                      <button onClick={() => removeCustomItem(i)} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Related categories */}
            {results.suggested_related_categories?.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1">
                  <ListFilter className="w-3 h-3" /> You might also hunt for:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {results.suggested_related_categories.map((rc, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => {
                        setCategory(rc);
                        setSearchQuery('');
                        setStep('search');
                      }}
                    >
                      {rc} <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-1" /> Start Over
              </Button>
              <Button variant="outline" onClick={() => setStep('search')} className="flex-1">
                Refine Search
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 flex-1"
                disabled={(selectedItems.size === 0 && customItems.length === 0) || saving}
                onClick={handleSaveSelected}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
                ) : (
                  <><ShoppingBag className="w-4 h-4 mr-1" /> Add {selectedItems.size + customItems.length} to Hunt List</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}