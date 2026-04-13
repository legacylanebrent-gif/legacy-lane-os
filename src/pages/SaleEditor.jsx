import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, X, Camera, Sparkles, Trash, Scan } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BatchPhotoGeneratorModal from '@/components/estate/BatchPhotoGeneratorModal';
import BatchPricingModal from '@/components/estate/BatchPricingModal';
import SaleClientPermissionsModal from '@/components/estate/SaleClientPermissionsModal';

const SALE_STATUSES = ['draft', 'active', 'completed'];

export default function SaleEditor() {
  const navigate = useNavigate();
  const [saleId, setSaleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dateForm, setDateForm] = useState({ start_date: '', start_time: '', end_time: '' });
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [photoTab, setPhotoTab] = useState('thumbnails');
  const [photoTitles, setPhotoTitles] = useState({});
  const [photoDescriptions, setPhotoDescriptions] = useState({});
  const [photoPricing, setPhotoPricing] = useState({});
  const [regeneratingDesc, setRegeneratingDesc] = useState({});
  const [serpSearching, setSerpSearching] = useState({});
  const [serpResults, setSerpResults] = useState({});
  const [regeneratingPrice, setRegeneratingPrice] = useState({});
  const [generatingTags, setGeneratingTags] = useState(false);
  const [featuredNationally, setFeaturedNationally] = useState(false);
  const [featuredLocally, setFeaturedLocally] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimer = useRef(null);
  const isInitialLoad = useRef(true);
  const saleIdRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sale_type: '',
    status: 'draft',
    property_address: { street: '', city: '', state: '', zip: '' },
    location: null,
    sale_dates: [],
    images: [],
    categories: [],
    commission_rate: '',
    special_notes: '',
    payment_methods: []
  });

  // Keep saleIdRef in sync so auto-save closure has latest value
  useEffect(() => {
    saleIdRef.current = saleId;
  }, [saleId]);

  // Auto-save: debounce 3s after any formData change (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!formData.title.trim() || !formData.property_address.city.trim()) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const user = await base44.auth.me();
        const saveData = {
          title: formData.title,
          description: formData.description,
          sale_type: formData.sale_type,
          status: formData.status,
          property_address: {
            ...formData.property_address,
            formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
          },
          location: formData.location,
          sale_dates: formData.sale_dates,
          images: formData.images.map(img => ({ ...img })),
          commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
          categories: formData.categories,
          special_notes: formData.special_notes,
          payment_methods: formData.payment_methods,
          national_featured: featuredNationally,
          local_featured: featuredLocally,
        };
        const currentSaleId = saleIdRef.current;
        if (currentSaleId) {
          await base44.entities.EstateSale.update(currentSaleId, saveData);
        } else {
          const newSale = await base44.entities.EstateSale.create({
            ...saveData,
            operator_id: user.id,
            operator_name: user.full_name
          });
          setSaleId(newSale.id);
        }
      } catch (e) {
        console.error('Auto-save failed:', e);
      } finally {
        setAutoSaving(false);
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimer.current);
  }, [formData, featuredNationally, featuredLocally]);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('saleId');
      if (id) {
        setSaleId(id);
        await loadSale(id);
      } else {
        setLoading(false);
      }
      setTimeout(() => { isInitialLoad.current = false; }, 500);
    };
    init();
  }, []);

  const loadSale = async (id) => {
    try {
      const sales = await base44.entities.EstateSale.filter({ id });
      const saleData = sales[0];
      if (!saleData) throw new Error('Sale not found');

      setFormData({
        title: saleData.title || '',
        description: saleData.description || '',
        sale_type: saleData.sale_type || '',
        status: saleData.status || 'draft',
        property_address: saleData.property_address || { street: '', city: '', state: '', zip: '' },
        location: saleData.location || null,
        sale_dates: saleData.sale_dates || [],
        images: (saleData.images || []).map(img =>
          typeof img === 'string' ? { url: img, name: '', description: '' } : img
        ),
        categories: saleData.categories || [],
        commission_rate: saleData.commission_rate || '',
        special_notes: saleData.special_notes || '',
        payment_methods: saleData.payment_methods || [],
        national_featured: saleData.national_featured || false
      });
      setFeaturedNationally(saleData.national_featured || false);
      setFeaturedLocally(saleData.local_featured || false);

      const pricingData = await base44.entities.ItemPricing.filter({ sale_id: id });
      const pricingMap = {};
      pricingData.forEach(pricing => {
        pricingMap[pricing.photo_url] = {
          sources: pricing.sources || [],
          low_price: pricing.low_price,
          high_price: pricing.high_price,
          average_price: pricing.sources ?
            Math.round(pricing.sources.reduce((sum, s) => sum + s.price, 0) / pricing.sources.length) : 0
        };
      });
      setPhotoPricing(pricingMap);

      // Restore serpResults from saved SaleItemPricing records
      const serpData = await base44.entities.SaleItemPricing.filter({ sale_id: id });
      const serpMap = {};
      serpData.forEach(record => {
        serpMap[record.image_url] = {
          item_title: record.item_title,
          price_range: {
            min: record.price_min,
            max: record.price_max,
            avg: record.price_avg,
          },
          matches: record.top_matches || [],
        };
      });
      setSerpResults(serpMap);
    } catch (error) {
      console.error('Error loading sale:', error);
      alert('Error loading sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsKey = async () => {
    try {
      const response = await base44.functions.invoke('getConfig', {});
      return response.data.GOOGLE_MAPS_API_KEY;
    } catch (error) {
      return '';
    }
  };

  const geocodeAddress = async (address) => {
    if (!address.city || !address.state) return;
    try {
      const fullAddress = `${address.street ? address.street + ', ' : ''}${address.city}, ${address.state} ${address.zip}`;
      const key = await getGoogleMapsKey();
      if (!key) return;
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${key}`);
      const data = await response.json();
      if (data.results && data.results[0]) {
        const location = data.results[0].geometry.location;
        setFormData(prev => ({ ...prev, location: { lat: location.lat, lng: location.lng } }));
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      const newImages = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        newImages.push({ url: file_url, name: '', description: '' });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images');
    } finally {
      setUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 });
      e.target.value = '';
    }
  };

  const handleSave = async (publish = false) => {
    if (!formData.title.trim()) { alert('Please enter a sale title'); return; }
    if (!formData.property_address.city.trim()) { alert('Please enter a city'); return; }
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const saveData = {
        title: formData.title,
        description: formData.description,
        sale_type: formData.sale_type,
        status: formData.status,
        property_address: {
          ...formData.property_address,
          formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
        },
        location: formData.location,
        sale_dates: formData.sale_dates,
        images: formData.images.map(img => ({ ...img })),
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        categories: formData.categories,
        special_notes: formData.special_notes,
        payment_methods: formData.payment_methods,
        national_featured: featuredNationally,
        local_featured: featuredLocally,
        operator_id: saleId ? undefined : user.id,
        operator_name: saleId ? undefined : user.full_name
      };
      if (saleId) {
        await base44.entities.EstateSale.update(saleId, saveData);
      } else {
        const newSale = await base44.entities.EstateSale.create(saveData);
        setSaleId(newSale.id);
      }
      if (publish) {
        navigate(createPageUrl('MySales'));
      } else {
        alert('Sale saved successfully');
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Failed to save sale: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!saleId) return;
    if (!window.confirm('Are you sure you want to delete this sale?')) return;
    setSaving(true);
    try {
      await base44.entities.EstateSale.delete(saleId);
      navigate(createPageUrl('MySales'));
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale');
      setSaving(false);
    }
  };

  const handleAddDate = () => {
    if (!dateForm.start_date) { alert('Please enter a start date'); return; }
    const newDate = { date: dateForm.start_date, start_time: dateForm.start_time || '', end_time: dateForm.end_time || '' };
    setFormData(prev => ({ ...prev, sale_dates: [...prev.sale_dates, newDate] }));
    setDateForm({ start_date: '', start_time: '', end_time: '' });
  };

  const handleRemoveDate = (index) => {
    setFormData(prev => ({ ...prev, sale_dates: prev.sale_dates.filter((_, i) => i !== index) }));
  };

  const handleRegenerateDescription = async (index) => {
    const image = formData.images[index];
    if (!image.name) return;
    setRegeneratingDesc(prev => ({ ...prev, [index]: true }));
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed, accurate description for this estate sale item: "${image.name}". Focus on key features, condition indicators, and what makes it valuable or interesting. Keep it concise but informative (2-3 sentences).`,
        file_urls: [image.url]
      });
      const description = response.trim();
      setPhotoDescriptions(prev => ({ ...prev, [image.url]: description }));
      const updated = [...formData.images];
      updated[index].description = description;
      setFormData({ ...formData, images: updated });
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Failed to generate description');
    } finally {
      setRegeneratingDesc(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleGenerateFeaturedTags = async () => {
    const itemsWithInfo = formData.images.filter(img => img.name && img.description);
    if (itemsWithInfo.length === 0) { alert('Please add titles and descriptions to your items first'); return; }
    setGeneratingTags(true);
    try {
      const itemsData = itemsWithInfo.map(img => ({ name: img.name, description: img.description, price: img.price || 0 }));
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these estate sale items and identify the most vintage, unique, and expensive items. Generate 5-8 featured item category tags that would attract buyers.\n\nItems:\n${JSON.stringify(itemsData, null, 2)}\n\nFocus on:\n- Vintage/antique items\n- Unique or rare pieces\n- High-value items\n- Items with collector appeal\n\nReturn concise, appealing category tags (e.g., "Mid-Century Furniture", "Vintage Jewelry", "Rare Collectibles").`,
        response_json_schema: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } }
      });
      const tags = response.tags || [];
      if (tags.length > 0) {
        setFormData(prev => ({ ...prev, categories: [...new Set([...(prev.categories || []), ...tags])] }));
      }
    } catch (error) {
      console.error('Error generating tags:', error);
      alert('Failed to generate tags');
    } finally {
      setGeneratingTags(false);
    }
  };

  const cleanTitle = (raw) => raw ? raw.replace(/\s*[-|—]\s*(etsy|ebay|amazon|walmart|1stdibs|ruby lane|chairish|bonanza|mercari|poshmark|facebook|google|bing)[^\S\n]*/gi, '').trim() : raw;

  const handleSerpSearch = async (index) => {
    const image = formData.images[index];
    if (!image.url) return;
    setSerpSearching(prev => ({ ...prev, [index]: true }));
    try {
      const res = await base44.functions.invoke('googleLensPricing', { image_url: image.url, sale_id: saleId });
      const data = res.data;
      setSerpResults(prev => ({ ...prev, [image.url]: data }));

      const updatedImages = [...formData.images];
      const img = { ...updatedImages[index] };

      if (data.item_title && !img.name) {
        const cleanedTitle = cleanTitle(data.item_title);
        img.name = cleanedTitle;
        setPhotoTitles(pt => ({ ...pt, [image.url]: cleanedTitle }));
      }

      if (!img.description) {
        const withPrices = (data.matches || []).filter(m => m.price && m.title);
        const withTitles = (data.matches || []).filter(m => m.title);
        const sources = withPrices.slice(0, 3);
        const knownTitle = cleanTitle(data.item_title) || (withTitles[0] && cleanTitle(withTitles[0].title));
        let desc = '';
        if (knownTitle) desc += `${knownTitle}.`;
        if (sources.length > 0) {
          const priceList = sources.map(m => `${m.price} on ${m.source}`).join(', ');
          desc += ` Currently listed for ${priceList}.`;
        }
        if (data.price_range?.min && data.price_range?.max) {
          desc += ` Market price range: $${data.price_range.min}–$${data.price_range.max}.`;
        }
        if (desc.trim()) {
          img.description = desc.trim();
          setPhotoDescriptions(pd => ({ ...pd, [image.url]: desc.trim() }));
        }
      }

      if (data.price_range?.avg && !img.price) {
        img.price = data.price_range.avg;
      }

      updatedImages[index] = img;
      setFormData(prev => ({ ...prev, images: updatedImages }));
    } catch (e) {
      alert('SerpAI Search failed: ' + e.message);
    } finally {
      setSerpSearching(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleRegeneratePrice = async (index) => {
    const image = formData.images[index];
    if (!image.name) return;
    setRegeneratingPrice(prev => ({ ...prev, [index]: true }));
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Research current market prices for: "${image.name}"\n\nSearch multiple sources (eBay sold listings, online marketplaces, antique dealers).\nReturn a JSON with pricing data.`,
        add_context_from_internet: true,
        file_urls: [image.url],
        response_json_schema: {
          type: "object",
          properties: {
            sources: { type: "array", items: { type: "object", properties: { site: { type: "string" }, price: { type: "number" } } } }
          }
        }
      });
      const sources = response.sources || [];
      if (sources.length > 0) {
        const prices = sources.map(s => s.price);
        const lowPrice = Math.min(...prices);
        const highPrice = Math.max(...prices);
        const avgPrice = Math.round(sources.reduce((sum, s) => sum + s.price, 0) / sources.length);
        setPhotoPricing(prev => ({ ...prev, [image.url]: { sources, low_price: lowPrice, high_price: highPrice, average_price: avgPrice } }));
        setFormData(prev => {
          const updated = [...prev.images];
          updated[index] = { ...updated[index], price: avgPrice };
          return { ...prev, images: updated };
        });
        if (saleId) {
          const existingPricing = await base44.entities.ItemPricing.filter({ sale_id: saleId, photo_url: image.url });
          const pricingData = { sale_id: saleId, photo_url: image.url, sources, low_price: lowPrice, high_price: highPrice };
          if (existingPricing.length > 0) {
            await base44.entities.ItemPricing.update(existingPricing[0].id, pricingData);
          } else {
            await base44.entities.ItemPricing.create(pricingData);
          }
        }
      }
    } catch (error) {
      console.error('Error generating price:', error);
      alert('Failed to generate price');
    } finally {
      setRegeneratingPrice(prev => ({ ...prev, [index]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0">
            <button onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-serif font-bold text-slate-900 truncate">{saleId ? 'Edit Sale' : 'Create New Sale'}</h1>
              <p className="text-xs lg:text-sm text-slate-500 hidden sm:block">
                {autoSaving ? '⏳ Auto-saving...' : 'Fill in the details for your estate sale'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => navigate(createPageUrl('MySales'))} className="hidden sm:flex">Cancel</Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} size="sm" className="text-xs lg:text-sm">
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs lg:text-sm">
              {saving ? 'Saving...' : 'Done'}
            </Button>
          </div>
        </div>
      </div>

      <BatchPhotoGeneratorModal
        open={showGeneratorModal}
        onClose={() => setShowGeneratorModal(false)}
        images={formData.images}
        onPhotosUpdated={(index, photo) => {
          const updated = [...formData.images];
          updated[index] = photo;
          setFormData({ ...formData, images: updated });
        }}
        onTitleGenerated={(index, title) => {
          const key = formData.images[index]?.url;
          if (key) {
            setPhotoTitles(prev => ({ ...prev, [key]: title }));
            const updated = [...formData.images];
            updated[index].name = title;
            setFormData({ ...formData, images: updated });
          }
        }}
        onDescriptionGenerated={(index, description) => {
          const key = formData.images[index]?.url;
          if (key) {
            setPhotoDescriptions(prev => ({ ...prev, [key]: description }));
            const updated = [...formData.images];
            updated[index].description = description;
            setFormData({ ...formData, images: updated });
          }
        }}
        startIndex={0}
      />

      <BatchPricingModal
        open={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        images={formData.images}
        saleId={saleId}
        onPriceUpdated={(index, price) => {
          const updated = [...formData.images];
          updated[index].price = price;
          setFormData({ ...formData, images: updated });
        }}
        onPricingGenerated={(index, pricingData) => {
          const key = formData.images[index]?.url;
          if (key) {
            setPhotoPricing(prev => ({ ...prev, [key]: pricingData }));
          }
        }}
        startIndex={0}
      />

      <SaleClientPermissionsModal
        open={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        saleId={saleId}
      />

      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Sale Title *</Label>
                <Input
                  id="title"
                  placeholder="Estate Sale - Beautiful Family Home"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sale Type</Label>
                  <Select value={formData.sale_type} onValueChange={(value) => setFormData({ ...formData, sale_type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estate_sale">Estate Sale</SelectItem>
                      <SelectItem value="moving_sale">Moving Sale</SelectItem>
                      <SelectItem value="downsizing_sale">Downsizing Sale</SelectItem>
                      <SelectItem value="liquidation">Liquidation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SALE_STATUSES.map(status => (
                        <SelectItem key={status} value={status} className="capitalize">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the estate sale..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px] lg:min-h-[72px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Street Address</Label>
                <Input
                  placeholder="123 Main Street"
                  value={formData.property_address.street}
                  onChange={(e) => {
                    const newAddress = { ...formData.property_address, street: e.target.value };
                    setFormData({ ...formData, property_address: newAddress });
                    geocodeAddress(newAddress);
                  }}
                />
              </div>
              <div>
                <Label>City *</Label>
                <Input
                  placeholder="Austin"
                  value={formData.property_address.city}
                  onChange={(e) => {
                    const newAddress = { ...formData.property_address, city: e.target.value };
                    setFormData({ ...formData, property_address: newAddress });
                    geocodeAddress(newAddress);
                  }}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  placeholder="TX"
                  value={formData.property_address.state}
                  onChange={(e) => {
                    const newAddress = { ...formData.property_address, state: e.target.value };
                    setFormData({ ...formData, property_address: newAddress });
                    geocodeAddress(newAddress);
                  }}
                />
              </div>
              <div className="col-span-2">
                <Label>ZIP Code</Label>
                <Input
                  placeholder="78701"
                  value={formData.property_address.zip}
                  onChange={(e) => {
                    const newAddress = { ...formData.property_address, zip: e.target.value };
                    setFormData({ ...formData, property_address: newAddress });
                    geocodeAddress(newAddress);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Date & Time</h2>
            <div className="space-y-4 mb-4">
              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input id="start-date" type="date" value={dateForm.start_date} onChange={(e) => setDateForm({ ...dateForm, start_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Daily Start Time</Label>
                  <Input id="start-time" type="time" value={dateForm.start_time} onChange={(e) => setDateForm({ ...dateForm, start_time: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="end-time">Daily End Time</Label>
                  <Input id="end-time" type="time" value={dateForm.end_time} onChange={(e) => setDateForm({ ...dateForm, end_time: e.target.value })} />
                </div>
              </div>
            </div>
            <Button onClick={handleAddDate} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Sale Date
            </Button>
            {formData.sale_dates.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="font-medium text-slate-900">Sale Dates ({formData.sale_dates.length})</h3>
                <div className="space-y-2">
                  {formData.sale_dates.map((saleDate, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">{saleDate.date}</p>
                        {(saleDate.start_time || saleDate.end_time) && (
                          <p className="text-slate-600">{saleDate.start_time} - {saleDate.end_time}</p>
                        )}
                      </div>
                      <button onClick={() => handleRemoveDate(index)} className="text-red-600 hover:text-red-700 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Tabs value={photoTab} onValueChange={setPhotoTab}>
              <TabsList className="w-full">
                <TabsTrigger value="thumbnails" className="flex-1">Thumbnails</TabsTrigger>
                <TabsTrigger value="descriptions" className="flex-1">Descriptions & Pricing</TabsTrigger>
              </TabsList>
              <TabsContent value="thumbnails" className="space-y-4">
                {uploadingImages && uploadProgress.total > 0 && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                    <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                    <p className="text-xs text-slate-600 text-center">Uploading {uploadProgress.current} of {uploadProgress.total}...</p>
                  </div>
                )}
                {formData.images.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">Photos ({formData.images.length})</h3>
                    <DragDropContext onDragEnd={(result) => {
                      if (!result.destination) return;
                      const items = Array.from(formData.images);
                      const [reordered] = items.splice(result.source.index, 1);
                      items.splice(result.destination.index, 0, reordered);
                      setFormData({ ...formData, images: items });
                    }}>
                      <Droppable droppableId="images" direction="horizontal">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                            {formData.images.map((image, index) => (
                              <Draggable key={index} draggableId={`image-${index}`} index={index}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                                    <img src={image.url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) })}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50">
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" id="camera-upload" disabled={uploadingImages} multiple />
                    <label htmlFor="camera-upload" className="cursor-pointer block">
                      <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-900">Take Photos</p>
                    </label>
                  </div>
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center bg-green-50">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" disabled={uploadingImages} />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <Plus className="w-10 h-10 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-900">Choose Files</p>
                    </label>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="descriptions" className="space-y-4">
                {formData.images.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No photos added yet</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row justify-end gap-2">
                      <Button variant="outline" size="sm" className="text-purple-600 border-purple-600 w-full lg:w-auto" onClick={async () => {
                        if (!saleId) { alert('Save the sale first'); return; }
                        if (!window.confirm(`Run SerpAI Search on all ${formData.images.length} photos?`)) return;
                        for (let i = 0; i < formData.images.length; i++) {
                          const img = formData.images[i];
                          setSerpSearching(prev => ({ ...prev, [i]: true }));
                          try {
                            const res = await base44.functions.invoke('googleLensPricing', { image_url: img.url, sale_id: saleId });
                            const data = res.data;
                            setSerpResults(prev => ({ ...prev, [img.url]: data }));
                            setFormData(prev => {
                              const updated = [...prev.images];
                              const item = { ...updated[i] };
                              if (data.item_title && !item.name) {
                                const t = cleanTitle(data.item_title);
                                item.name = t;
                                setPhotoTitles(pt => ({ ...pt, [img.url]: t }));
                              }
                              if (!item.description) {
                                const withPrices = (data.matches || []).filter(m => m.price && m.title);
                                const sources = withPrices.slice(0, 3);
                                const knownTitle = cleanTitle(data.item_title);
                                let desc = '';
                                if (knownTitle) desc += `${knownTitle}.`;
                                if (sources.length > 0) desc += ` Currently listed for ${sources.map(m => `${m.price} on ${m.source}`).join(', ')}.`;
                                if (data.price_range?.min && data.price_range?.max) desc += ` Market price range: $${data.price_range.min}–$${data.price_range.max}.`;
                                if (desc.trim()) {
                                  item.description = desc.trim();
                                  setPhotoDescriptions(pd => ({ ...pd, [img.url]: desc.trim() }));
                                }
                              }
                              if (data.price_range?.avg && !item.price) item.price = data.price_range.avg;
                              updated[i] = item;
                              return { ...prev, images: updated };
                            });
                          } catch (e) { console.error(e); }
                          setSerpSearching(prev => ({ ...prev, [i]: false }));
                          await new Promise(r => setTimeout(r, 1000));
                        }
                      }}>
                        <Scan className="w-4 h-4 mr-2" />
                        SerpAI Search All
                      </Button>
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600 w-full lg:w-auto" onClick={() => setShowGeneratorModal(true)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Generate Titles
                      </Button>
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 w-full lg:w-auto" onClick={() => setShowPricingModal(true)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Generate Pricing
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-600 w-full lg:w-auto" onClick={() => {
                        if (window.confirm('Remove all pricing from photos?')) {
                          const updated = formData.images.map(img => ({ ...img, price: null }));
                          setFormData({ ...formData, images: updated });
                          setPhotoPricing({});
                        }
                      }}>
                        <Trash className="w-4 h-4 mr-2" />
                        Remove All Pricing
                      </Button>
                    </div>
                    {formData.images.map((image, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                          <img src={image.url} alt={`Photo ${index + 1}`} className="w-full lg:w-20 h-40 lg:h-20 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 space-y-3 w-full min-w-0">
                            <div>
                              <Label htmlFor={`name-${index}`} className="text-xs">Name</Label>
                              <Textarea
                                id={`name-${index}`}
                                placeholder="Item name"
                                value={photoTitles[image.url] || image.name || ''}
                                onChange={(e) => {
                                  setPhotoTitles(prev => ({ ...prev, [image.url]: e.target.value }));
                                  const updated = [...formData.images];
                                  updated[index].name = e.target.value;
                                  setFormData({ ...formData, images: updated });
                                }}
                                className="text-sm min-h-[48px]"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`desc-${index}`} className="text-xs">Description</Label>
                              <Textarea
                                id={`desc-${index}`}
                                placeholder="Item description"
                                value={photoDescriptions[image.url] || image.description || ''}
                                onChange={(e) => {
                                  setPhotoDescriptions(prev => ({ ...prev, [image.url]: e.target.value }));
                                  const updated = [...formData.images];
                                  updated[index].description = e.target.value;
                                  setFormData({ ...formData, images: updated });
                                }}
                                className="text-sm min-h-[120px] lg:min-h-[72px]"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`price-${index}`} className="text-xs">Price</Label>
                              <Input
                                id={`price-${index}`}
                                type="number"
                                placeholder="Price"
                                value={image.price || ''}
                                onChange={(e) => {
                                  const updated = [...formData.images];
                                  updated[index].price = e.target.value ? parseFloat(e.target.value) : null;
                                  setFormData({ ...formData, images: updated });
                                }}
                                className="text-sm"
                              />
                              {photoPricing[image.url] && (
                                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                                  <div className="space-y-1">
                                    {photoPricing[image.url].sources.map((source, i) => (
                                      <div key={i} className="flex justify-between text-xs gap-2">
                                        <span className="text-slate-600 truncate">{source.site}</span>
                                        <span className="font-medium flex-shrink-0">${source.price}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="pt-2 border-t border-orange-300">
                                    <div className="flex justify-between text-xs font-semibold text-orange-700">
                                      <span>Avg Price</span>
                                      <span>${photoPricing[image.url].average_price}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="mt-3 flex flex-col gap-2">
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs border-purple-400 text-purple-700 hover:bg-purple-50" onClick={() => handleSerpSearch(index)} disabled={serpSearching[index]}>
                                  <Scan className="w-3 h-3 mr-1" />
                                  {serpSearching[index] ? 'Searching...' : 'SerpAI Search'}
                                </Button>
                                {serpResults[image.url] && !serpResults[image.url].error && (
                                  <div className="mt-1 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1 overflow-hidden w-full">
                                    <p className="font-semibold text-purple-800 truncate">{serpResults[image.url].item_title}</p>
                                    {serpResults[image.url].price_range?.avg && (
                                      <div className="flex gap-3 text-purple-700 font-medium flex-wrap">
                                        <span>Low: ${serpResults[image.url].price_range.min}</span>
                                        <span className="font-bold text-purple-900">Avg: ${serpResults[image.url].price_range.avg}</span>
                                        <span>High: ${serpResults[image.url].price_range.max}</span>
                                      </div>
                                    )}
                                    {serpResults[image.url].matches?.filter(m => m.price).length > 0 && (
                                      <div className="border-t border-purple-200 pt-1 space-y-1">
                                        <p className="text-purple-500 font-medium">Source Prices:</p>
                                        {serpResults[image.url].matches.filter(m => m.price).map((match, mi) => (
                                          <div key={mi} className="flex justify-between items-center gap-2 min-w-0">
                                            <a href={match.link} target="_blank" rel="noopener noreferrer" className="text-purple-700 hover:underline truncate flex-1 min-w-0">{match.source || match.title}</a>
                                            <span className="font-bold text-green-700 flex-shrink-0">{match.price}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(image.url)}`, '_blank')}>
                                  Use Google Lens
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => handleRegenerateDescription(index)} disabled={regeneratingDesc[index]}>
                                  {regeneratingDesc[index] ? 'Generating...' : 'Regenerate Description'}
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => handleRegeneratePrice(index)} disabled={regeneratingPrice[index]}>
                                  {regeneratingPrice[index] ? 'Generating...' : 'Regenerate Price'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Featured Items */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Featured Items</h2>
              <Button variant="outline" size="sm" className="text-orange-600 border-orange-600" onClick={handleGenerateFeaturedTags} disabled={generatingTags}>
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingTags ? 'Generating...' : 'AI Suggest'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="e.g., Antique furniture, Vintage jewelry..." className="flex-1" />
              <Button variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
            </div>
            {formData.categories && formData.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.categories.map((category, index) => (
                  <Badge key={index} variant="outline" className="px-3 py-1">
                    {category}
                    <button onClick={() => setFormData({ ...formData, categories: formData.categories.filter((_, i) => i !== index) })} className="ml-2 text-slate-500 hover:text-slate-700">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Clients - Permissions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Sale Clients - Permissions</h2>
                <p className="text-sm text-slate-600">Manage page access permissions for assigned clients</p>
              </div>
              {saleId && (
                <Button variant="outline" size="sm" onClick={() => setShowPermissionsModal(true)} className="flex-shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
            {!saleId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <div className="text-amber-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                </div>
                <p className="text-sm text-amber-800">Save the sale first to assign clients and manage permissions.</p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                </div>
                <p className="text-sm text-blue-800">Assign clients from your CRM connections and give them access to specific pages like inventory, statistics, and contracts.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment & Special Instructions */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment & Special Instructions</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Accepted Payment Methods</h3>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="e.g., Cash, Credit Card, Venmo..." value={paymentMethodInput} onChange={(e) => setPaymentMethodInput(e.target.value)} />
                    <Button variant="outline" size="icon" onClick={() => {
                      if (paymentMethodInput.trim()) {
                        setFormData(prev => ({ ...prev, payment_methods: [...(prev.payment_methods || []), paymentMethodInput.trim()] }));
                        setPaymentMethodInput('');
                      }
                    }}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.payment_methods && formData.payment_methods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.payment_methods.map((method, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1">
                          {method}
                          <button onClick={() => setFormData({ ...formData, payment_methods: formData.payment_methods.filter((_, i) => i !== index) })} className="ml-2 text-slate-500 hover:text-slate-700">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Special Instructions</h3>
                  <Textarea placeholder="Parking info, entry requirements, etc..." value={formData.special_notes} onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })} rows={4} />
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">Feature Nationally</h3>
                      <p className="text-sm text-slate-600">Display prominently on the national homepage</p>
                    </div>
                    <Switch checked={featuredNationally} onCheckedChange={setFeaturedNationally} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">Feature Locally</h3>
                      <p className="text-sm text-slate-600">Display prominently on local/regional pages</p>
                    </div>
                    <Switch checked={featuredLocally} onCheckedChange={setFeaturedLocally} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => navigate(createPageUrl('MySales'))}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? 'Saving...' : 'Save & Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}