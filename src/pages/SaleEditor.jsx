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
import { ArrowLeft, Plus, X, Camera, Sparkles, Scan, Brain, Wand2, FileDown, Printer, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Switch } from '@/components/ui/switch';
import BatchPhotoGeneratorModal from '@/components/estate/BatchPhotoGeneratorModal';
import BatchPricingModal from '@/components/estate/BatchPricingModal';
import SaleClientPermissionsModal from '@/components/estate/SaleClientPermissionsModal';
import DeepSearchPricingModal from '@/components/estate/DeepSearchPricingModal';
import StarterPublishFeeModal from '@/components/estate/StarterPublishFeeModal';
import ZipAddressEntry from '@/components/estate/ZipAddressEntry';
import SalePhotoReviewStep from '@/components/estate/SalePhotoReviewStep';
import ProfileCompletionGate, { isProfileComplete } from '@/components/profile/ProfileCompletionGate';
import GoogleLensCreditDisplay from '@/components/pricing/GoogleLensCreditDisplay';
import { getImageSrc } from '@/utils/imageOptimizer';
import PdfGenerationModal from '@/components/estate/PdfGenerationModal';
import ImageImportModal from '@/components/estate/ImageImportModal';
import DeepSearchProgressModal from '@/components/estate/DeepSearchProgressModal';

const SALE_STATUSES = ['draft', 'upcoming', 'active', 'completed', 'archived'];

const formatTimeAMPM = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
};

export default function SaleEditor() {
  const navigate = useNavigate();
  const [saleId, setSaleId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageImportModal, setShowImageImportModal] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [dateForm, setDateForm] = useState({ start_date: '', start_time: '09:00', end_time: '14:00' });
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
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [featuredNationally, setFeaturedNationally] = useState(false);
  const [featuredLocally, setFeaturedLocally] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [selectedPricingImage, setSelectedPricingImage] = useState(null);
  const [showPublishFeeModal, setShowPublishFeeModal] = useState(false);
  const [pendingPublish, setPendingPublish] = useState(false);
  const [originalStatus, setOriginalStatus] = useState('draft');
  const [serpBatchRunning, setSerpBatchRunning] = useState(false);
  const [serpBatchProgress, setSerpBatchProgress] = useState({ current: 0, total: 0, stoppedAt: null });
  const [multiItemAssessing, setMultiItemAssessing] = useState({});
  const [multiItemResults, setMultiItemResults] = useState({});
  const [multiItemFlags, setMultiItemFlags] = useState({});
  const [quickScanning, setQuickScanning] = useState(false);
  const [quickScanProgress, setQuickScanProgress] = useState({ current: 0, total: 0 });
  const [showSkipGuideModal, setShowSkipGuideModal] = useState(false);
  const [step1Completed, setStep1Completed] = useState(false);
  const [showQuickScanGuideModal, setShowQuickScanGuideModal] = useState(false);
  const [showDeepSearchGuideModal, setShowDeepSearchGuideModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [imageThumbnails, setImageThumbnails] = useState({});
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [imageDebugInfo, setImageDebugInfo] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [showDeepSearchModal, setShowDeepSearchModal] = useState(false);
  const [deepSearchModalIndex, setDeepSearchModalIndex] = useState(0);
  const [regeneratingThumbs, setRegeneratingThumbs] = useState(false);
  const [savingImageIndex, setSavingImageIndex] = useState(null);
  const [thumbProgress, setThumbProgress] = useState({ current: 0, total: 0 });
  const [pdfStatus, setPdfStatus] = useState('loading');
  const [pdfProgress, setPdfProgress] = useState(0);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const gridRef = useRef(null);
  const pointerIdRef = useRef(null);
  const pdfCancelRef = useRef(false);
  const autoSaveTimer = useRef(null);
  const isInitialLoad = useRef(true);
  const saleIdRef = useRef(null);
  const runBatchRef = useRef(null);
  const formDataRef = useRef(null);

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

  // Debug: track image src info whenever images change
  useEffect(() => {
    const info = formData.images.slice(0, 5).map((img, i) => {
      const src = getImageSrc(img, 200, { imageThumbnails, index: i });
      const hasUrl = !!img.url;
      const hasThumb = !!img.thumbnail_url;
      const hasMapThumb = !!(imageThumbnails && imageThumbnails[String(i)]);
      return { index: i, src: src ? `${src.substring(0, 80)}...` : 'NULL', hasUrl, hasThumb, hasMapThumb, urlType: typeof img.url };
    });
    setImageDebugInfo(info);
  }, [formData.images, imageThumbnails]);

  // Keep formDataRef in sync so auto-save always writes the latest state
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Reset stuck saving state when user returns from another tab (e.g. Google Lens)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setSaving(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Auto-save: debounce 3s after any formData change (skip initial load)
  // NOTE: images are intentionally excluded — they are saved directly on each mutation
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!formData.title.trim() || !formData.property_address.city.trim()) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const latest = formDataRef.current;
        const user = await base44.auth.me();
        const saveData = {
          title: latest.title,
          description: latest.description,
          sale_type: latest.sale_type,
          status: latest.status,
          property_address: {
            ...latest.property_address,
            formatted_address: `${latest.property_address.street}, ${latest.property_address.city}, ${latest.property_address.state} ${latest.property_address.zip}`
          },
          location: latest.location,
          sale_dates: latest.sale_dates,
          commission_rate: latest.commission_rate ? parseFloat(latest.commission_rate) : null,
          categories: latest.categories,
          special_notes: latest.special_notes,
          payment_methods: latest.payment_methods,
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
            operator_name: user.full_name,
            images: latest.images.map(img => ({ ...img })),
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
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          base44.auth.redirectToLogin('/SaleEditor');
          return;
        }
        setUser(currentUser);

        const params = new URLSearchParams(window.location.search);
        const id = params.get('saleId');
        if (id) {
          setSaleId(id);
          await loadSale(id);
        } else {
          setLoading(false);
        }
        setTimeout(() => { isInitialLoad.current = false; }, 500);
      } catch (err) {
        console.error('SaleEditor init error:', err);
        base44.auth.redirectToLogin('/SaleEditor');
      }
    };
    init();
  }, []);

  const loadSale = async (id) => {
    try {
      const sales = await base44.entities.EstateSale.filter({ id });
      const saleData = sales[0];
      if (!saleData) throw new Error('Sale not found');

      setOriginalStatus(saleData.status || 'draft');
      setFormData({
        title: saleData.title || '',
        description: saleData.description || '',
        sale_type: saleData.sale_type || '',
        status: saleData.status || 'draft',
        property_address: saleData.property_address || { street: '', city: '', state: '', zip: '' },
        location: saleData.location || null,
        sale_dates: saleData.sale_dates || [],
        images: (saleData.images || []).map(img => {
          const imageObj = typeof img === 'string' ? { url: img, name: '', description: '' } : img;
          // Preserve serp_search_status so saves don't wipe out SalePhotoReviewStep decisions
          return imageObj;
        }),
        categories: saleData.categories || [],
        commission_rate: saleData.commission_rate || '',
        special_notes: saleData.special_notes || '',
        payment_methods: saleData.payment_methods || [],
        national_featured: saleData.national_featured || false
      });
      setFeaturedNationally(saleData.national_featured || false);
      setFeaturedLocally(saleData.local_featured || false);
      setImageThumbnails(saleData.image_thumbnails || {});
      setExpandedCards(computeDefaultExpanded(saleData.images || []));

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

      // Auto-complete step 1 if they've previously reviewed photos or done AI searches
      const images = saleData.images || [];
      const hasSkipped = images.some(img => img.skip_item === true || img.skip_item === false);
      const hasSerpResults = serpData.length > 0;
      const hasProcessed = images.some(img => img.name || img.description || img.ai_first_search_price);
      // Also complete if images have been explicitly saved via SalePhotoReviewStep (any has skip_updated_at)
      const hasBeenReviewed = images.some(img => img.skip_updated_at);
      if (hasSkipped || hasSerpResults || hasProcessed || hasBeenReviewed) {
        setStep1Completed(true);
      }
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

  const handleOpenImageImport = () => {
    setShowImageImportModal(true);
  };

  const handleImageImportComplete = async (newImages) => {
    setShowImageImportModal(false);
    if (!newImages) return; // user cancelled

    // Update local state
    setFormData(prev => ({ ...prev, images: newImages }));
    setExpandedCards(computeDefaultExpanded(newImages));

    // Save to DB in one shot
    const currentSaleId = saleIdRef.current;
    if (currentSaleId) {
      try {
        await base44.entities.EstateSale.update(currentSaleId, { images: newImages });
      } catch (dbErr) {
        console.error('DB save after import failed:', dbErr.message);
        alert('Photos uploaded but save to sale failed. Please click Save manually.');
      }
    }
  };

  const handleSave = async (publish = false, skipFeeCheck = false) => {
    if (!isProfileComplete(user)) { alert('Please complete your profile first (company name + location) before saving a sale.'); navigate(createPageUrl('MyProfile')); return; }
    if (!formData.title.trim()) { alert('Please enter a sale title'); return; }
    if (!formData.property_address.city.trim()) { alert('Please enter a city'); return; }

    // Check if Starter user is trying to publish (draft → active/upcoming)
    const isPublishing = ['upcoming', 'active'].includes(formData.status) && originalStatus === 'draft';
    if (isPublishing && !skipFeeCheck) {
      try {
        const user = await base44.auth.me();
        const packages = await base44.entities.SubscriptionPackage.filter({
          account_type: 'estate_sale_operator',
          tier_level: 'basic',
          is_active: true
        });
        const starterPkg = packages[0];
        if (starterPkg && user.subscription_package_id === starterPkg.id) {
          setPendingPublish(publish);
          setShowPublishFeeModal(true);
          return;
        }
        // Also check by subscription_tier field if it exists
        if (user.subscription_tier === 'basic' || user.subscription_tier === 'starter') {
          setPendingPublish(publish);
          setShowPublishFeeModal(true);
          return;
        }
      } catch (e) {
        // If check fails, proceed normally
      }
    }

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
        // NOTE: images are NOT included here — they are saved directly on each mutation
        // (upload, toggle skip, serp search, batch). Including them here would overwrite
        // serp_search_status fields written by SalePhotoReviewStep.
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
          categories: formData.categories,
          special_notes: formData.special_notes,
          payment_methods: formData.payment_methods,
          national_featured: featuredNationally,
          local_featured: featuredLocally,
          operator_id: saleId ? undefined : user.id,
          operator_name: saleId ? undefined : user.full_name,
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
    if (image.skip_item || image.skip_serp_search || image.serp_search_status === 'do_not_search') {
      alert('This image is marked as skipped. Un-skip it first.');
      return;
    }
    setRegeneratingDesc(prev => ({ ...prev, [index]: true }));
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed, accurate description for this estate sale item titled: "${image.name}". Focus on key features, condition indicators, what makes it valuable or interesting, and any relevant historical or collector context. Keep it concise but informative (2-3 sentences).`,
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
    if (image.skip_item || image.skip_serp_search || image.serp_search_status === 'do_not_search') {
      alert('This image is marked as skipped. Un-skip it first.');
      return;
    }
    setSerpSearching(prev => ({ ...prev, [index]: true }));
    try {
      // Check credits first
      try {
        const creditCheck = await base44.functions.invoke('checkGoogleLensCredits', {});
        if (!creditCheck.data.allowed) {
          alert(creditCheck.data.reason || 'No Google Lens searches remaining. Purchase more credits to continue.');
          setSerpSearching(prev => ({ ...prev, [index]: false }));
          return;
        }
      } catch (creditErr) {
        // If check fails, proceed with the search (backward compatibility)
        console.warn('Credit check failed, proceeding anyway:', creditErr.message);
      }

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

      if (!img.synopsis) {
        const withPrices = (data.matches || []).filter(m => m.price && m.title);
        const withTitles = (data.matches || []).filter(m => m.title);
        const sources = withPrices.slice(0, 3);
        const knownTitle = cleanTitle(data.item_title) || (withTitles[0] && cleanTitle(withTitles[0].title));
        let syn = '';
        if (knownTitle) syn += `${knownTitle}.`;
        if (sources.length > 0) {
          const priceList = sources.map(m => `${m.price} on ${m.source}`).join(', ');
          syn += ` Currently listed for ${priceList}.`;
        }
        if (data.price_range?.min && data.price_range?.max) {
          syn += ` Market price range: $${data.price_range.min}–$${data.price_range.max}.`;
        }
        if (syn.trim()) {
          img.synopsis = syn.trim();
        }
      }

      if (data.price_range?.avg && !img.price) {
        img.price = data.price_range.avg;
      }

      updatedImages[index] = img;
      setFormData(prev => ({ ...prev, images: updatedImages }));
    } catch (e) {
      console.error('SerpAI Search error:', e.message);
      setSerpResults(prev => ({ ...prev, [image.url]: { error: e.message } }));
      if (/run out|credits|quota|limit|payment|account/i.test(e.message)) {
        alert('AI search credits have been exhausted. Please contact support to continue.');
      }
    } finally {
      setSerpSearching(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleQuickScan = async () => {
    const toScan = formData.images
      .map((img, i) => ({ img, i }))
      .filter(({ img, i }) => !img.name && !img.description && !img.skip_item && !img.skip_serp_search && img.serp_search_status !== 'do_not_search' && multiItemFlags[i] === undefined);

    if (toScan.length === 0) {
      alert('All images have already been scanned or processed.');
      return;
    }

    setQuickScanning(true);
    setQuickScanProgress({ current: 0, total: toScan.length });

    // Run all scans in parallel (batches of 5 to avoid overwhelming)
    const BATCH = 5;
    let done = 0;
    for (let b = 0; b < toScan.length; b += BATCH) {
      const chunk = toScan.slice(b, b + BATCH);
      await Promise.all(chunk.map(async ({ img, i }) => {
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Look at this photo. Answer only: is this a photo of MULTIPLE different items (like a shelf of books, a table of mugs, a cabinet of pans, a pile of tools, boxes of misc items, etc)? Or is it a SINGLE identifiable item?\n\nReply with JSON only.`,
            file_urls: [img.url],
            response_json_schema: {
              type: "object",
              properties: {
                is_multi_item: { type: "boolean" },
                reason: { type: "string" }
              }
            }
          });
          setMultiItemFlags(prev => ({ ...prev, [i]: res.is_multi_item === true }));
        } catch (e) {
          console.warn(`Quick scan failed for image ${i}:`, e.message);
          setMultiItemFlags(prev => ({ ...prev, [i]: false }));
        }
        done++;
        setQuickScanProgress({ current: done, total: toScan.length });
      }));
    }

    setQuickScanning(false);
    setQuickScanProgress({ current: 0, total: 0 });
  };

  const handleMultiItemAssess = async (index) => {
    const image = formData.images[index];
    if (!image.url) return;
    if (image.skip_item || image.skip_serp_search || image.serp_search_status === 'do_not_search') {
      alert('This image is marked as skipped. Un-skip it first.');
      return;
    }
    setMultiItemAssessing(prev => ({ ...prev, [index]: true }));
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an estate sale pricing expert. Look at this photo carefully. This image likely contains MULTIPLE different items (e.g., books on a shelf, mugs on a table, baking pans in a cabinet, tools, etc.).

Identify every distinct item or group of similar items you can see. For each, provide:
- A short label (e.g. "Set of 6 mugs", "Vintage cookbooks (lot of 12)", "Cast iron skillet")
- An estimated estate sale price (what a buyer would reasonably pay at an estate sale — not retail)
- Any notable features

Then suggest a single "Lot Price" if selling everything in the photo together.

Be practical and realistic for an estate sale context.`,
        file_urls: [image.url],
        response_json_schema: {
          type: "object",
          properties: {
            scene_summary: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  estate_sale_price: { type: "number" },
                  notes: { type: "string" }
                }
              }
            },
            lot_price: { type: "number" },
            lot_price_rationale: { type: "string" }
          }
        }
      });
      setMultiItemResults(prev => ({ ...prev, [index]: response }));
      // Auto-fill name and description if empty
      if (response.scene_summary) {
        setFormData(prev => {
          const updated = [...prev.images];
          if (!updated[index].name) updated[index].name = response.scene_summary;
          if (!updated[index].description) {
            const itemList = (response.items || []).map(it => `${it.label} (~$${it.estate_sale_price})`).join(', ');
            updated[index].description = itemList || response.scene_summary;
            setPhotoDescriptions(pd => ({ ...pd, [image.url]: updated[index].description }));
            setPhotoTitles(pt => ({ ...pt, [image.url]: updated[index].name }));
          }
          return { ...prev, images: updated };
        });
      }
    } catch (e) {
      console.error('Multi-item assess error:', e);
    } finally {
      setMultiItemAssessing(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSaveImage = async (index) => {
    const currentSaleId = saleId || new URLSearchParams(window.location.search).get('saleId');
    if (!currentSaleId) {
      alert('Please save the sale first before saving image data.');
      return;
    }
    setSavingImageIndex(index);
    try {
      await base44.entities.EstateSale.update(currentSaleId, { images: formData.images });
    } catch (e) {
      console.error('Failed to save image data:', e.message);
      alert('Failed to save image data: ' + e.message);
    } finally {
      setSavingImageIndex(false);
      setTimeout(() => setSavingImageIndex(null), 1500);
    }
  };

  const handleToggleSkip = async (index) => {
    const currentSaleId = saleId || new URLSearchParams(window.location.search).get('saleId');
    const img = formData.images[index];
    const newImg = img.skip_item
      ? { ...img, skip_item: false, name: '', description: '', synopsis: '', price: null, ai_first_search_price: null, ai_deep_search_price: null, skip_saved_name: '', skip_saved_description: '' }
      : { ...img, skip_item: true, skip_saved_name: img.name || '', skip_saved_description: img.description || '', name: '', description: '', skip_updated_at: new Date().toISOString() };

    // Update local state
    const newImages = [...formData.images];
    newImages[index] = newImg;
    setPhotoTitles(prev => ({ ...prev, [img.url]: newImg.name || '' }));
    setPhotoDescriptions(prev => ({ ...prev, [img.url]: newImg.description || '' }));
    setFormData(prev => ({ ...prev, images: newImages }));

    // Save only the changed image via backend to avoid payload-size errors with large image arrays
    if (currentSaleId) {
      try {
        await base44.functions.invoke('toggleSaleImageSkip', {
          sale_id: currentSaleId,
          image_index: index,
          skip_item: newImg.skip_item,
          skip_saved_name: newImg.skip_saved_name || '',
          skip_saved_description: newImg.skip_saved_description || '',
        });
      } catch (e) {
        console.error('Failed to persist skip toggle:', e.message);
        // Fallback: try direct update
        await base44.entities.EstateSale.update(currentSaleId, { images: newImages });
      }
    }
  };

  const handleRegeneratePrice = async (index) => {
    const image = formData.images[index];
    if (!image.name) return;
    if (!window.confirm('Deep dive pricing search can take up to 3 minutes per image. Continue?')) return;
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
          updated[index] = { ...updated[index], ai_deep_search_price: avgPrice };
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

  // Shared PDF builder - returns { doc, itemsWithIndex, thumbDataUrls }
  const buildPdfData = async (reportProgress = false) => {
    const itemsWithIndex = formData.images
      .map((img, origIdx) => ({ ...img, _origIdx: origIdx }))
      .filter(img => img.name || img.description || img.price || img.ai_first_search_price);

    if (itemsWithIndex.length === 0) {
      alert('No items with data to export. Add titles, descriptions, or prices first.');
      return null;
    }

    const doc = new jsPDF('p', 'mm', 'letter');
    const pgW = doc.internal.pageSize.getWidth();
    const pgH = doc.internal.pageSize.getHeight();
    const m = 8;
    const usableH = pgH - m * 2;
    const rowH = usableH / 30;
    const thumbSize = rowH - 1;
    const textStart = m + thumbSize + 2;
    const colW = (pgW - textStart - m) / 3;

    // Preload thumbnails
    const thumbDataUrls = {};
    const loadThumb = async (img) => {
      if (pdfCancelRef.current) return;
      const src = img.url ? getImageSrc(img, 200, { imageThumbnails, index: img._origIdx }) : null;
      if (!src) return;
      try {
        const imageEl = new Image();
        imageEl.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          imageEl.onload = resolve;
          imageEl.onerror = reject;
          imageEl.src = src;
        });
        const canvas = document.createElement('canvas');
        canvas.width = thumbSize * 3;
        canvas.height = thumbSize * 3;
        canvas.getContext('2d').drawImage(imageEl, 0, 0, canvas.width, canvas.height);
        thumbDataUrls[img.url] = canvas.toDataURL('image/jpeg', 0.5);
      } catch (_) {}
    };

    let loaded = 0;
    const total = itemsWithIndex.length;
    const chunkSize = 10;
    for (let i = 0; i < itemsWithIndex.length; i += chunkSize) {
      if (pdfCancelRef.current) return null;
      const chunk = itemsWithIndex.slice(i, i + chunkSize);
      await Promise.all(chunk.map(loadThumb));
      loaded = Math.min(i + chunkSize, total);
      if (reportProgress) setPdfProgress(Math.round((loaded / total) * 40));
    }

    if (pdfCancelRef.current) return null;

    // Title header
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text((formData.title || 'Estate Sale Items').substring(0, 50), m, m + 6);

    // Column headers
    const headerY = m + 10;
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('Name', textStart, headerY);
    doc.text('Description', textStart + colW, headerY);
    doc.text('Price', textStart + colW * 2, headerY);
    doc.setDrawColor(220, 220, 220);
    doc.line(m, headerY + 1, pgW - m, headerY + 1);

    let y = headerY + 1.5;
    let count = 0;

    for (const img of itemsWithIndex) {
      if (pdfCancelRef.current) return null;

      // Hard page break: if next row overflows bottom margin, start new page
      if (y + rowH > pgH - m) {
        doc.addPage();
        y = m + 4;
        doc.setDrawColor(220, 220, 220);
        doc.line(m, y - 1, pgW - m, y - 1);
      }

      if (thumbDataUrls[img.url]) {
        doc.addImage(thumbDataUrls[img.url], 'JPEG', m, y, thumbSize, thumbSize);
      }

      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      doc.text((img.name || '').substring(0, 30), textStart, y + 3);
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text((img.description || '').substring(0, 45), textStart + colW, y + 3);

      doc.setTextColor(0, 100, 0);
      doc.text(img.price ? `$${img.price}` : '-', textStart + colW * 2, y + 3);

      doc.setDrawColor(235, 235, 235);
      doc.line(m, y + rowH - 0.5, pgW - m, y + rowH - 0.5);

      count++;
      y += rowH;

      if (reportProgress && count % 5 === 0) {
        setPdfProgress(40 + Math.round((count / itemsWithIndex.length) * 60));
        await new Promise(r => setTimeout(r, 0));
      }
    }

    return { doc, itemsWithIndex, thumbDataUrls };
  };

  const handleExportPDF = async () => {
    pdfCancelRef.current = false;
    setPdfModalOpen(true);
    setPdfStatus('loading');
    setPdfProgress(0);

    try {
      const result = await buildPdfData(true);
      if (!result) { setPdfModalOpen(false); return; }

      setPdfStatus('building');
      setPdfProgress(100);
      setPdfStatus('done');

      setTimeout(() => {
        const filename = `${(formData.title || 'estate-sale').replace(/[^a-z0-9]/gi, '-').substring(0, 40)}-pricing.pdf`;
        result.doc.save(filename);
        setPdfModalOpen(false);
      }, 600);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
      setPdfModalOpen(false);
    }
  };

  const handlePrintPDF = async () => {
    pdfCancelRef.current = false;
    setPdfModalOpen(true);
    setPdfStatus('loading');
    setPdfProgress(0);

    try {
      const result = await buildPdfData(true);
      if (!result) { setPdfModalOpen(false); return; }

      setPdfStatus('building');
      setPdfProgress(100);
      setPdfStatus('done');

      setTimeout(() => {
        const blobUrl = result.doc.output('bloburl');
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => printWindow.print();
        }
        setPdfModalOpen(false);
      }, 600);
    } catch (err) {
      console.error('PDF print error:', err);
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
      setPdfModalOpen(false);
    }
  };

  const handleExportXLS = () => {
    const itemsWithData = formData.images
      .map((img, i) => ({ ...img, _idx: i }))
      .filter(img => img.name || img.description || img.price || img.ai_first_search_price);

    if (itemsWithData.length === 0) {
      alert('No items with data to export. Add titles, descriptions, or prices first.');
      return;
    }

    const rows = itemsWithData.map((img) => {
      const aiPrice = img.ai_first_search_price || (serpResults[img.url]?.price_range?.avg);
      return {
        'Name': img.name || '',
        'Description': img.description || '',
        'AI Price': aiPrice ? `$${aiPrice}` : '',
        'Listing Price': img.price ? `$${img.price}` : '',
      };
    });

    // Add summary row
    const totalListed = itemsWithData.filter(i => i.price).length;
    const totalValue = itemsWithData.reduce((sum, i) => sum + (i.price || 0), 0);
    rows.push({
      'Name': '',
      'Description': `${totalListed} items priced`,
      'AI Price': '',
      'Listing Price': totalValue > 0 ? `$${totalValue} total` : '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws['!cols'] = [
      { wch: 35 },  // Name
      { wch: 50 },  // Description
      { wch: 14 },  // AI Price
      { wch: 14 },  // Listing Price
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pricing Sheet');

    const filename = `${(formData.title || 'estate-sale').replace(/[^a-z0-9]/gi, '-').substring(0, 40)}-pricing.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const computeDefaultExpanded = (images) => {
    const expanded = {};
    images.forEach((img, i) => {
      // Expand by default if no name AND no price (nothing filled in yet)
      if (!img.name && !img.price) {
        expanded[i] = true;
      }
    });
    return expanded;
  };

  const handlePointerDown = (e, index) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    setDragIndex(index);
    setDragOverIndex(index);
  };

  const handlePointerMove = (e) => {
    if (dragIndex === null) return;
    const container = gridRef.current;
    if (!container) return;
    const children = container.children;
    let closest = dragIndex;
    let closestDist = Infinity;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (d < closestDist) { closestDist = d; closest = i; }
    }
    if (closest !== dragOverIndex) setDragOverIndex(closest);
  };

  const handlePointerUp = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const items = [...formData.images];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(dragOverIndex, 0, moved);
      setFormData(prev => ({ ...prev, images: items }));
      const currentSaleId = saleIdRef.current;
      if (currentSaleId) {
        await base44.entities.EstateSale.update(currentSaleId, { images: items });
      }
    }
    setDragIndex(null);
    setDragOverIndex(null);
    pointerIdRef.current = null;
  };

  // Global pointer listeners when dragging
  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragIndex, dragOverIndex]);

  const toggleAllCards = () => {
    const allExpanded = formData.images.length > 0 && formData.images.every((_, i) => expandedCards[i]);
    if (allExpanded) {
      setExpandedCards({});
    } else {
      const all = {};
      formData.images.forEach((_, i) => { all[i] = true; });
      setExpandedCards(all);
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

  const profileOk = isProfileComplete(user);

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden w-full max-w-full">
      {!profileOk && (
        <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-6">
          <ProfileCompletionGate user={user} actionLabel="create a sale" />
        </div>
      )}
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

      <>
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

        <DeepSearchPricingModal
          isOpen={!!selectedPricingImage}
          onClose={() => setSelectedPricingImage(null)}
          photoPricing={photoPricing}
          imageUrl={selectedPricingImage}
        />

        <ImageImportModal
          open={showImageImportModal}
          existingImages={formData.images}
          onComplete={handleImageImportComplete}
        />

        <DeepSearchProgressModal
          open={showDeepSearchModal}
          currentIndex={deepSearchModalIndex}
          totalCount={serpBatchProgress.total}
          images={formData.images}
          imageThumbnails={imageThumbnails}
        />

        <PdfGenerationModal
          open={pdfModalOpen}
          onClose={() => { pdfCancelRef.current = true; setPdfModalOpen(false); }}
          status={pdfStatus}
          progress={pdfProgress}
          onCancel={() => { pdfCancelRef.current = true; }}
        />

        <StarterPublishFeeModal
          open={showPublishFeeModal}
          onClose={() => setShowPublishFeeModal(false)}
          saleName={formData.title}
          onFeePaid={() => {
            setShowPublishFeeModal(false);
            handleSave(pendingPublish, true);
          }}
        />

        {/* Step 2 Quick AI Scan Guide Modal */}
        {showQuickScanGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <h2 className="text-lg font-bold text-slate-900">Quick AI Scan</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                The AI will look at each photo and determine whether it contains a <strong>single identifiable item</strong> or <strong>multiple different items</strong>.
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5 flex-shrink-0">✓</span>
                  <span><strong>Single item photos</strong> — flagged as ready for Deep Search (Step 3)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">⊛</span>
                  <span><strong>Multi-item photos</strong> — flagged as MULTI so Step 3 skips them (use "Multi-Item AI Assess" on those instead)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">⊘</span>
                  <span><strong>Already skipped photos</strong> — ignored entirely</span>
                </li>
              </ul>
              <p className="text-xs text-slate-500 bg-teal-50 border border-teal-200 rounded-lg p-3">
                💡 This scan runs all photos in parallel and typically completes in under a minute. Only unscanned photos without a name or description are included.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuickScanGuideModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowQuickScanGuideModal(false); handleQuickScan(); }}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Start Quick Scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 Deep Search Guide Modal */}
        {showDeepSearchGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                <h2 className="text-lg font-bold text-slate-900">Deep Search for Pricing & Descriptions</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Each eligible photo will be sent through an <strong>AI-powered image search</strong> to find matching items across the web. For each match we'll pull:
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5 flex-shrink-0">🔍</span>
                  <span><strong>Item title</strong> — auto-filled into the Name field if blank</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5 flex-shrink-0">📝</span>
                  <span><strong>AI Synopsis</strong> — internal research notes from real listing sources &amp; price ranges (operator-only, not public)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5 flex-shrink-0">💵</span>
                  <span><strong>AI Suggested Price</strong> — average market value across matched listings</span>
                </li>
              </ul>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1 text-xs text-slate-600">
                <p>⊘ <strong>Skipped photos</strong> (flagged in Step 1) are excluded.</p>
                <p>⊛ <strong>Multi-item photos</strong> (flagged in Step 2) are skipped — use "Multi-Item AI Assess" on those.</p>
                <p>✓ Only photos <strong>without a name</strong> are processed to avoid overwriting your work.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeepSearchGuideModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowDeepSearchGuideModal(false); runBatchRef.current && runBatchRef.current(0); }}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Start Deep Search
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1 Skip Guide Modal */}
        {showSkipGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <h2 className="text-lg font-bold text-slate-900">Flag Photos to Skip</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Before running any AI searches, scroll through your photos and press <strong className="text-red-600">⊘ Don't Search</strong> on any image that:
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Close-up or detail shot</strong> — zoomed in on a pattern, mark, or label (not the full item)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Duplicate photo</strong> — same item photographed from a different angle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Multi-item scene</strong> — a shelf, table, or pile of many different things that can't be identified as one item</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                  <span><strong>Non-searchable image</strong> — blurry, room overview, or anything unlikely to return a useful price</span>
                </li>
              </ul>
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                💡 Skipped photos are excluded from Steps 2 & 3, saving API credits and keeping results clean.
              </p>
              <button
                onClick={() => { setShowSkipGuideModal(false); setStep1Completed(true); }}
                className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                Got it — I'll scroll through and flag them
                </button>
            </div>
          </div>
        )}
        </>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8 space-y-6 w-full overflow-x-hidden">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="w-full max-w-md mx-auto">
            <TabsTrigger value="info" className="flex-1 text-base font-semibold">Sale Info</TabsTrigger>
            <TabsTrigger value="images" className="flex-1 text-base font-semibold">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-0">
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
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estate_tag_sale_private_home">Estate/Tag Sale Inside Private Home</SelectItem>
                      <SelectItem value="online_only_auction">Online Only Auction</SelectItem>
                      <SelectItem value="auction">Auction</SelectItem>
                      <SelectItem value="moving_sale_private_home">Moving Sale Inside Private Home</SelectItem>
                      <SelectItem value="estate_tag_sale_offsite_warehouse">Estate/Tag Sale Moved Offsite to Warehouse</SelectItem>
                      <SelectItem value="auction_house">Auction House</SelectItem>
                      <SelectItem value="appointment_required_sale">Sale That Requires an Appointment</SelectItem>
                      <SelectItem value="estate_sale_offsite_store">Estate Sale Moved Offsite to Store</SelectItem>
                      <SelectItem value="business_closing">Business Closing</SelectItem>
                      <SelectItem value="online_estate_sale">Online Estate Sale</SelectItem>
                      <SelectItem value="outside_sale">Outside Sale</SelectItem>
                      <SelectItem value="buyout_or_cleanout">Buyout Or Cleanout</SelectItem>
                      <SelectItem value="demolition_sale">Demolition Sale</SelectItem>
                      <SelectItem value="single_item_type_collection">Single Item Type Collection</SelectItem>
                      <SelectItem value="bundle_buyout">Bundle Buyout</SelectItem>
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
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  {(() => {
                    const itemsWithData = formData.images.filter(img => img.name && img.description);
                    const isEnabled = itemsWithData.length > 0;
                    return (
                      <Button
                        type="button"
                        size="sm"
                        disabled={!isEnabled || generatingDesc}
                        onClick={async () => {
                          const items = formData.images.filter(img => img.name && img.description);
                          const city = formData.property_address?.city || '';
                          const state = formData.property_address?.state || '';
                          setGeneratingDesc(true);
                          try {
                            const itemList = items.map(img => `- ${img.name}: ${img.description}`).join('\n');
                            const response = await base44.integrations.Core.InvokeLLM({
                              prompt: `You are an expert estate sale copywriter and SEO specialist. Write a compelling, SEO-rich sale description for an estate sale in ${city}${state ? ', ' + state : ''}.

The sale includes the following items:
${itemList}

Requirements:
- Start with a strong hook mentioning the location (${city}${state ? ', ' + state : ''})
- Naturally weave in key item names and categories for SEO
- Keep it concise and easy to read (3–5 sentences max)
- Highlight the most noteworthy/valuable items
- Sound warm and inviting to estate sale shoppers
- Do NOT use bullet points — write as flowing prose
- This description will be prominently indexed by search engines, so make it count

Return ONLY the description text, no extra commentary.`
                            });
                            setFormData(prev => ({ ...prev, description: response.trim() }));
                          } catch (e) {
                            alert('Failed to generate description: ' + e.message);
                          }
                          setGeneratingDesc(false);
                        }}
                        className={`gap-1.5 text-xs h-7 px-3 ${isEnabled ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                      >
                        <Wand2 className="w-3 h-3" />
                        {generatingDesc ? 'Generating...' : 'AI Autogenerate Sale Description'}
                      </Button>
                    );
                  })()}
                </div>
                <Textarea
                  placeholder="Describe the estate sale..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px] lg:min-h-[72px]"
                />
                {formData.images.filter(img => img.name && img.description).length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Add titles & descriptions to your photos to unlock AI description generation.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
            <ZipAddressEntry
              address={formData.property_address}
              location={formData.location}
              onChange={(newAddress) => setFormData(prev => ({ ...prev, property_address: newAddress }))}
              onLocationChange={(loc) => setFormData(prev => ({ ...prev, location: loc }))}
            />
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Date & Time</h2>
            <div className="space-y-4 mb-4">
              <div>
                <Label htmlFor="start-date">Select Date *</Label>
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
                          <p className="text-slate-600">{formatTimeAMPM(saleDate.start_time)} - {formatTimeAMPM(saleDate.end_time)}</p>
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

        {/* Post-Sale Actions */}
        {saleId && (
          <Card className="border-purple-200 bg-purple-50/40">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <h2 className="text-base font-semibold text-slate-900">Post-Sale Actions</h2>
              </div>
              <p className="text-xs text-slate-500">After your sale completes, offer remaining inventory to registered resellers privately.</p>
              <Button
                variant="outline"
                className="border-purple-400 text-purple-700 hover:bg-purple-100 w-full sm:w-auto"
                onClick={() => navigate(`/ResellerPackupEventEditor?saleId=${saleId}`)}
              >
                <span className="mr-2">📦</span>
                Create Reseller Pack-Up Event
              </Button>
              <p className="text-xs text-slate-400">This creates a private, invite-only event for resellers only. Not visible to the public.</p>
            </CardContent>
          </Card>
        )}

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
          </TabsContent>

          <TabsContent value="images" className="space-y-6 mt-0">
        {/* Photos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {user && <GoogleLensCreditDisplay operatorId={user.id} compact />}
            <Tabs value={photoTab} onValueChange={setPhotoTab}>
              <TabsList className="w-full">
                <TabsTrigger value="thumbnails" className="flex-1 text-xs sm:text-sm">Thumbnails</TabsTrigger>
                <TabsTrigger value="descriptions" className="flex-1 text-xs sm:text-sm">Descriptions & Pricing</TabsTrigger>
              </TabsList>
              <TabsContent value="thumbnails" className="space-y-4">

                {formData.images.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-slate-900">Photos ({formData.images.length})</h3>
                    <div className="flex flex-wrap gap-3" ref={gridRef}>
                      {formData.images.map((image, index) => (
                        <div
                          key={index}
                          onPointerDown={(e) => handlePointerDown(e, index)}
                          className={`w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-3rem)/5)] relative group rounded-lg overflow-hidden bg-slate-200 aspect-square cursor-grab active:cursor-grabbing touch-none select-none ${
                            dragIndex === index ? 'opacity-40 scale-95 z-10' : ''
                          } ${
                            dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''
                          }`}
                          style={{ transition: dragIndex !== null ? 'transform 0.15s ease, opacity 0.15s ease' : 'none' }}
                        >
                          <img
                            src={typeof image === 'string' ? image : image.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover pointer-events-none"
                            width="200" height="200" loading="lazy"
                            onLoad={() => setImageErrors(prev => ({ ...prev, [index]: false }))}
                            onError={(e) => {
                              const errMsg = e.target.src ? `${e.target.src.substring(0, 60)}...` : 'empty src';
                              setImageErrors(prev => ({ ...prev, [index]: errMsg }));
                            }}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) }); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleOpenImageImport}
                    className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-900">Take Photos</p>
                    <p className="text-xs text-blue-600 mt-1">Opens camera + import modal</p>
                  </button>
                  <button
                    onClick={handleOpenImageImport}
                    className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <Plus className="w-10 h-10 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-900">Choose Files</p>
                    <p className="text-xs text-green-600 mt-1">Opens file picker modal</p>
                  </button>
                </div>
              </TabsContent>
              <TabsContent value="descriptions" className="space-y-4">
                {formData.images.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No photos added yet</p>
                ) : (
                  <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                     <Button variant="outline" size="sm" className="text-green-700 border-green-600" onClick={handleExportXLS}>
                       <FileDown className="w-4 h-4 mr-2" />
                       Export Pricing Sheet
                     </Button>
                     <Button variant="outline" size="sm" className="text-blue-700 border-blue-600" onClick={handlePrintPDF}>
                       <Printer className="w-4 h-4 mr-2" />
                       Print Pricing Sheet
                     </Button>

                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 w-full hidden" onClick={async () => {
                      const toProcess = formData.images.filter(img => img.name && img.description);
                      if (toProcess.length === 0) { alert('All images must have title and description first'); return; }
                      if (!window.confirm(`Batch deep search pricing for ${toProcess.length} items. This may take a few minutes. Continue?`)) return;
                      for (let i = 0; i < formData.images.length; i++) {
                        const img = formData.images[i];
                        if (!img.name || !img.description) continue;
                        setRegeneratingPrice(prev => ({ ...prev, [i]: true }));
                        try {
                          const response = await base44.integrations.Core.InvokeLLM({
                            prompt: `Research current market prices for: "${img.name}"\n\nSearch multiple sources (eBay sold listings, online marketplaces, antique dealers).\nReturn a JSON with pricing data.`,
                            add_context_from_internet: true,
                            file_urls: [img.url],
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
                            setPhotoPricing(prev => ({ ...prev, [img.url]: { sources, low_price: lowPrice, high_price: highPrice, average_price: avgPrice } }));
                            setFormData(prev => {
                              const updated = [...prev.images];
                              updated[i] = { ...updated[i], ai_deep_search_price: avgPrice };
                              return { ...prev, images: updated };
                            });
                            if (saleId) {
                              try {
                                const existingPricing = await base44.entities.ItemPricing.filter({ sale_id: saleId, photo_url: img.url });
                                const pricingData = { sale_id: saleId, photo_url: img.url, sources, low_price: lowPrice, high_price: highPrice };
                                if (existingPricing.length > 0) {
                                  await base44.entities.ItemPricing.update(existingPricing[0].id, pricingData);
                                } else {
                                  await base44.entities.ItemPricing.create(pricingData);
                                }
                              } catch (saveError) {
                                console.error('Error saving pricing to database:', saveError);
                              }
                            }
                          }
                        } catch (error) { console.error(error); }
                        setRegeneratingPrice(prev => ({ ...prev, [i]: false }));
                        await new Promise(r => setTimeout(r, 1000));
                      }
                    }}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Batch Deep Search Price
                    </Button>
                    {(() => {
                        const unprocessed = formData.images.filter(img => !img.name && img.skip_item !== true);
                        const resumeIndex = serpBatchProgress.stoppedAt;
                        const runBatch = async (startFromIndex = 0) => {
                         if (!saleId) { alert('Save the sale first'); return; }
                         const remaining = formData.images.slice(startFromIndex).filter((img, relIdx) => {
                         const absIdx = startFromIndex + relIdx;
                         const statusOk = img.serp_search_status === "search_allowed" || img.serp_search_status === undefined || img.serp_search_status === null;
                         return !img.name && !multiItemFlags[absIdx] && img.skip_item !== true &&
                          img.skip_serp_search !== true && img.serp_search_status !== "do_not_search" && statusOk;
                         });
                         if (remaining.length === 0) { alert('All eligible images have already been processed. Multi-item images are skipped — use "Multi-Item AI Assess" on those.'); return; }
                         const flaggedCount = formData.images.slice(startFromIndex).filter((img, relIdx) => multiItemFlags[startFromIndex + relIdx]).length;
                         const msg = `${remaining.length} image(s) will be processed via AI image search.${flaggedCount > 0 ? `\n\n${flaggedCount} multi-item image(s) will be skipped — use "Multi-Item AI Assess" on those.` : ''}\n\nContinue?`;
                         if (!window.confirm(msg)) return;
                          setSerpBatchRunning(true);
                          setSerpBatchProgress({ current: 0, total: remaining.length, stoppedAt: null });
                          setShowDeepSearchModal(true);
                          let processed = 0;
                           let batchCount = 0;
                           for (let i = startFromIndex; i < formData.images.length; i++) {
                             const img = formData.images[i];
                             if (img.name) continue;
                             if (multiItemFlags[i]) continue;
                             if (img.skip_item === true) continue;
                             // Safety check: never search images marked as do_not_search
                             if (img.skip_serp_search === true || img.serp_search_status === "do_not_search") continue;
                             setDeepSearchModalIndex(i);
                             setSerpSearching(prev => ({ ...prev, [i]: true }));
                             try {
                               // Check credits before each search
                               try {
                                 const creditCheck = await base44.functions.invoke('checkGoogleLensCredits', {});
                                 if (!creditCheck.data.allowed) {
                                   setSerpBatchProgress(prev => ({ ...prev, stoppedAt: i, current: processed }));
                                   setSerpSearching({});
                                   setSerpBatchRunning(false);
                                   setShowDeepSearchModal(false);
                                   alert(`Google Lens credit limit reached after ${processed} image(s).\n\nPurchase more credits to continue.`);
                                   return;
                                 }
                               } catch (creditErr) {
                                 console.warn('Credit check failed, proceeding anyway:', creditErr.message);
                               }

                               const res = await base44.functions.invoke('googleLensPricing', { image_url: img.url, sale_id: saleId });
                               const data = res.data;
                               if (data.error) {
                                 console.warn(`AI search skipped image ${i + 1}: ${data.error}`);
                                 setSerpResults(prev => ({ ...prev, [img.url]: { error: data.error } }));
                                 if (/run out|credits|quota|limit|payment|account/i.test(data.error)) {
                                   setSerpBatchProgress(prev => ({ ...prev, stoppedAt: i, current: processed }));
                                   setSerpSearching({});
                                   setSerpBatchRunning(false);
                                   setShowDeepSearchModal(false);
                                   alert(`AI search credits exhausted after ${processed} image(s).\n\nPlease contact support, then click "Resume from image ${i + 1}" to continue.`);
                                   return;
                                 }
                               } else {
                                 setSerpResults(prev => ({ ...prev, [img.url]: data }));
                                 setFormData(prev => {
                                   const updated = [...prev.images];
                                   const item = { ...updated[i] };
                                   if (data.item_title && !item.name) {
                                     const t = cleanTitle(data.item_title);
                                     item.name = t;
                                     setPhotoTitles(pt => ({ ...pt, [img.url]: t }));
                                   }
                                   if (!item.synopsis) {
                                     const withPrices = (data.matches || []).filter(m => m.price && m.title);
                                     const sources = withPrices.slice(0, 3);
                                     const knownTitle = cleanTitle(data.item_title);
                                     let syn = '';
                                     if (knownTitle) syn += `${knownTitle}.`;
                                     if (sources.length > 0) syn += ` Currently listed for ${sources.map(m => `${m.price} on ${m.source}`).join(', ')}.`;
                                     if (data.price_range?.min && data.price_range?.max) syn += ` Market price range: $${data.price_range.min}–$${data.price_range.max}.`;
                                     if (syn.trim()) {
                                       item.synopsis = syn.trim();
                                     }
                                   }
                                   if (data.price_range?.avg) item.ai_first_search_price = data.price_range.avg;
                                   updated[i] = item;
                                   return { ...prev, images: updated };
                                 });
                                 processed++;
                                 batchCount++;
                                 setSerpBatchProgress(prev => ({ ...prev, current: processed }));
                                 // Save to DB every 10 images
                                 if (batchCount >= 10) {
                                   try {
                                     const latest = formDataRef.current;
                                     await base44.entities.EstateSale.update(saleId, { images: latest.images });
                                   } catch (_) {}
                                   batchCount = 0;
                                 }
                               }
                             } catch (e) {
                              console.warn(`AI search skipped image ${i + 1}:`, e.message);
                             }
                             setSerpSearching(prev => ({ ...prev, [i]: false }));
                             await new Promise(r => setTimeout(r, 1000));
                           }
                           // Save any remaining images
                           if (batchCount > 0) {
                             try {
                               const latest = formDataRef.current;
                               await base44.entities.EstateSale.update(saleId, { images: latest.images });
                             } catch (_) {}
                           }
                           setSerpBatchRunning(false);
                           setShowDeepSearchModal(false);
                           setSerpBatchProgress({ current: 0, total: 0, stoppedAt: null });
                        };
                        const multiItemCount = Object.values(multiItemFlags).filter(Boolean).length;
                        const unscanned = formData.images.filter((img, i) => !img.name && !img.description && multiItemFlags[i] === undefined).length;
                        runBatchRef.current = runBatch;
                        return (
                           <>
                             <Button variant="outline" size="sm" className="text-slate-700 border-slate-400 font-semibold" onClick={() => setShowSkipGuideModal(true)}>
                               <span className="mr-2 w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0">1</span>
                               Flag Photos to Skip Search
                             </Button>
                             {step1Completed && (<>
                             <Button variant="outline" size="sm" className="text-teal-600 border-teal-600" disabled={quickScanning || serpBatchRunning} onClick={() => setShowQuickScanGuideModal(true)}>
                               <span className="mr-2 w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0">2</span>
                               {quickScanning
                                 ? `Scanning... (${quickScanProgress.current}/${quickScanProgress.total})`
                                 : `Quick AI Scan${unscanned > 0 ? ` (${unscanned} to scan)` : ' All'}${multiItemCount > 0 ? ` · ${multiItemCount} multi-item flagged` : ''}`}
                             </Button>
                             <Button variant="outline" size="sm" className="text-purple-600 border-purple-600" disabled={serpBatchRunning || quickScanning} onClick={() => setShowDeepSearchGuideModal(true)}>
                               <span className="mr-2 w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0">3</span>
                               {serpBatchRunning ? `Processing... (${serpBatchProgress.current}/${serpBatchProgress.total})` : `Deep Search for Pricing & Descriptions${unprocessed.length > 0 ? ` (${unprocessed.length - multiItemCount} eligible)` : ''}`}
                             </Button>
                            {resumeIndex !== null && resumeIndex !== undefined && (
                              <Button variant="outline" size="sm" className="text-orange-600 border-orange-600" disabled={serpBatchRunning} onClick={() => runBatch(resumeIndex)}>
                                <Scan className="w-4 h-4 mr-2" />
                                Resume from image {resumeIndex + 1}
                              </Button>
                            )}
                            </>)}
                          </>
                        );
                      })()}
                      {step1Completed && <Button variant="outline" size="sm" className="text-blue-600 border-blue-600" onClick={async () => {
                        if (!window.confirm('Step 4: Regenerate descriptions for all items that have a title?')) return;
                        for (let i = 0; i < formData.images.length; i++) {
                          const img = formData.images[i];
                          if (!img.name) continue;
                          if (img.skip_item || img.skip_serp_search || img.serp_search_status === 'do_not_search') continue;
                          setRegeneratingDesc(prev => ({ ...prev, [i]: true }));
                          try {
                            const response = await base44.integrations.Core.InvokeLLM({
                              prompt: `Generate a detailed, accurate description for this estate sale item titled: "${img.name}". Focus on key features, condition indicators, what makes it valuable or interesting, and any relevant historical or collector context. Keep it concise but informative (2-3 sentences).`,
                            });
                            const description = response.trim();
                            setPhotoDescriptions(prev => ({ ...prev, [img.url]: description }));
                            setFormData(prev => {
                              const updated = [...prev.images];
                              updated[i] = { ...updated[i], description };
                              return { ...prev, images: updated };
                            });
                          } catch (e) { console.error(e); }
                          setRegeneratingDesc(prev => ({ ...prev, [i]: false }));
                          await new Promise(r => setTimeout(r, 500));
                        }
                      }}>
                        <span className="mr-2 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center justify-center flex-shrink-0">4</span>
                        Regenerate Item Descriptions
                        </Button>}
                    </div>
                    {!step1Completed && saleId ? (
                      <SalePhotoReviewStep
                        saleId={saleId}
                        onStepComplete={() => {
                          setStep1Completed(true);
                          // Reload formData images so serp batch has updated statuses
                          base44.entities.EstateSale.filter({ id: saleId }).then(res => {
                            if (res[0]) setFormData(prev => ({ ...prev, images: res[0].images || [] }));
                          });
                        }}
                      />
                    ) : !step1Completed && !saleId ? (
                      <p className="text-slate-500 text-sm py-4">Save the sale first to begin Step 1 photo review.</p>
                    ) : null}

                    <div className={step1Completed ? "space-y-3" : "hidden"}>
                     {formData.images.length > 1 && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="text-xs text-slate-500 hover:text-slate-700 w-full"
                         onClick={toggleAllCards}
                       >
                         {formData.images.every((_, i) => expandedCards[i])
                           ? <><ChevronsDownUp className="w-3.5 h-3.5 mr-1" /> Collapse all Item Descriptions</>
                           : <><ChevronsUpDown className="w-3.5 h-3.5 mr-1" /> Expand all Item Descriptions</>}
                       </Button>
                     )}
                    {formData.images.map((image, index) => {
                       const isExpanded = expandedCards[index];
                       return (
                       <Card key={index} className="overflow-hidden">
                         <button
                           type="button"
                           onClick={() => setExpandedCards(prev => prev[index] ? {} : { [index]: true })}
                           className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                         >
                           <img src={getImageSrc(image, 200, { imageThumbnails, index })} alt={`Photo ${index + 1}`} className="w-10 h-10 object-cover rounded flex-shrink-0 bg-slate-200" width="40" height="40" loading="lazy" />
                           <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                             {image.name || `Photo ${index + 1}`}
                           </span>
                           {image.price > 0 && <span className="text-xs font-semibold text-green-700">${image.price}</span>}
                           {image.skip_item && <Badge variant="outline" className="text-red-500 border-red-300 text-[10px]">Skipped</Badge>}
                           {multiItemFlags[index] && <Badge variant="outline" className="text-teal-500 border-teal-300 text-[10px]">MULTI</Badge>}
                           <span className="text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                         </button>
                         {isExpanded && (
                           <div className="px-3 pb-3">
                         <div className="flex flex-col lg:flex-row gap-4">
                          {/* Left: Large thumbnail + compact action buttons */}
                          <div className="flex-shrink-0 flex flex-row lg:flex-col gap-2 lg:w-40">
                            <div className="relative w-28 h-28 lg:w-40 lg:h-40 flex-shrink-0">
                              <img
                                src={getImageSrc(image, 400, { imageThumbnails, index })}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg bg-slate-200"
                                width="160" height="160" loading="lazy"
                              />
                              {multiItemFlags[index] === true && (
                                <button type="button" title="Flagged as multi-item"
                                  onClick={() => setMultiItemFlags(prev => ({ ...prev, [index]: false }))}
                                  className="absolute top-1 left-1 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-teal-700"
                                >MULTI</button>
                              )}
                              {multiItemFlags[index] === false && (
                                <button type="button" title="Flagged as single item"
                                  onClick={() => setMultiItemFlags(prev => ({ ...prev, [index]: true }))}
                                  className="absolute top-1 left-1 bg-slate-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-teal-600"
                                >1x</button>
                              )}
                            </div>
                            <div className="flex lg:flex-col gap-1 flex-1 lg:flex-initial">
                              <button type="button" onClick={() => handleToggleSkip(index)}
                                className={`flex-1 lg:flex-initial py-1.5 px-2 rounded border text-[11px] font-medium transition-colors leading-tight ${image.skip_item ? 'bg-red-100 border-red-400 text-red-700' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-red-50 hover:border-red-400 hover:text-red-600'}`}
                              >{image.skip_item ? '↩ Search' : '⊘ Skip'}</button>
                              <button type="button" onClick={async () => {
                                const currentSaleId = saleId || new URLSearchParams(window.location.search).get('saleId');
                                const updatedImages = [...formData.images];
                                updatedImages[index] = { ...updatedImages[index], name: '', description: '', synopsis: '', price: null, ai_first_search_price: null };
                                setPhotoTitles(prev => ({ ...prev, [image.url]: '' }));
                                setPhotoDescriptions(prev => ({ ...prev, [image.url]: '' }));
                                setSerpResults(prev => { const next = { ...prev }; delete next[image.url]; return next; });
                                setMultiItemResults(prev => { const next = { ...prev }; delete next[index]; return next; });
                                setFormData(prev => ({ ...prev, images: updatedImages }));
                                if (currentSaleId) {
                                  try {
                                    await base44.functions.invoke('toggleSaleImageSkip', {
                                      sale_id: currentSaleId, image_index: index, skip_item: false,
                                      skip_saved_name: '', skip_saved_description: '', clear_data: true,
                                    });
                                  } catch (e) {
                                    await base44.entities.EstateSale.update(currentSaleId, { images: updatedImages });
                                  }
                                }
                              }}
                                className="flex-1 lg:flex-initial py-1.5 px-2 rounded border text-[11px] font-medium bg-slate-50 border-slate-300 text-slate-500 hover:bg-red-50 hover:border-red-500 hover:text-red-700"
                              >✕ Clear</button>
                            </div>
                          </div>

                          {/* Right: Form fields in a more compact 2-col layout */}
                          {step1Completed && <div className="flex-1 min-w-0 space-y-3">
                            {/* Name + AI Price row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor={`name-${index}`} className="text-xs">Name</Label>
                                <Textarea
                                  id={`name-${index}`} placeholder="Item name"
                                  value={photoTitles[image.url] || image.name || ''}
                                  onChange={(e) => {
                                    setPhotoTitles(prev => ({ ...prev, [image.url]: e.target.value }));
                                    const updated = [...formData.images];
                                    updated[index].name = e.target.value;
                                    setFormData({ ...formData, images: updated });
                                  }}
                                  className="text-sm min-h-[44px] w-full" rows={2}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`listing-price-${index}`} className="text-xs font-semibold text-slate-800">Listing Price</Label>
                                <div className="flex gap-2 items-start">
                                  <Input
                                    id={`listing-price-${index}`} type="number" placeholder="$0"
                                    value={image.price || ''}
                                    onChange={(e) => {
                                      const updated = [...formData.images];
                                      updated[index].price = e.target.value ? parseFloat(e.target.value) : null;
                                      setFormData({ ...formData, images: updated });
                                    }}
                                    className="text-sm font-medium flex-1"
                                  />
                                  <div className="text-sm px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-md text-purple-800 font-medium whitespace-nowrap text-xs">
                                    {image.ai_first_search_price || serpResults[image.url]?.price_range?.avg
                                      ? `AI: $${image.ai_first_search_price || serpResults[image.url]?.price_range?.avg}`
                                      : <span className="text-purple-400 font-normal">No AI</span>}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <Label htmlFor={`desc-${index}`} className="text-xs">Description</Label>
                              <Textarea
                                id={`desc-${index}`} placeholder="Item description"
                                value={photoDescriptions[image.url] || image.description || ''}
                                onChange={(e) => {
                                  setPhotoDescriptions(prev => ({ ...prev, [image.url]: e.target.value }));
                                  const updated = [...formData.images];
                                  updated[index].description = e.target.value;
                                  setFormData({ ...formData, images: updated });
                                }}
                                className="text-sm min-h-[56px] w-full" rows={2}
                              />
                            </div>

                            {/* Synopsis */}
                            {image.synopsis && (
                              <div>
                                <Label className="text-xs text-indigo-700">AI Synopsis <span className="text-slate-400 font-normal">(operator only)</span></Label>
                                <div className="text-xs px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-800 whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                                  {image.synopsis}
                                </div>
                              </div>
                            )}

                            {/* SERP Results (compact) */}
                            {serpResults[image.url] && !serpResults[image.url].error && (
                              <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1">
                                {serpResults[image.url].price_range?.avg && (
                                  <div className="flex gap-3 text-purple-700 font-medium flex-wrap">
                                    <span>Low: ${serpResults[image.url].price_range.min}</span>
                                    <span className="font-bold text-purple-900">Avg: ${serpResults[image.url].price_range.avg}</span>
                                    <span>High: ${serpResults[image.url].price_range.max}</span>
                                  </div>
                                )}
                                {image.price > 0 && (
                                  <div className="flex items-center gap-2 bg-green-100 border border-green-400 rounded px-2 py-1">
                                    <span className="text-green-800 font-semibold">✓ Listed at: ${image.price}</span>
                                  </div>
                                )}
                                {serpResults[image.url].matches?.filter(m => m.price).length > 0 && (
                                  <div className="border-t border-purple-200 pt-1 flex flex-wrap gap-1">
                                    {serpResults[image.url].matches.filter(m => m.price).map((match, mi) => {
                                      const rawPrice = match.price;
                                      const numericPrice = typeof rawPrice === 'object' ? (rawPrice?.extracted_value || null) : parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
                                      const displayPrice = typeof rawPrice === 'object' ? (rawPrice?.extracted_value ? `$${rawPrice.extracted_value}` : JSON.stringify(rawPrice)) : rawPrice;
                                      const isSelected = image.price === numericPrice;
                                      return (
                                        <button key={mi} type="button"
                                          onClick={() => { if (!numericPrice) return; const updated = [...formData.images]; updated[index] = { ...updated[index], price: numericPrice }; setFormData(prev => ({ ...prev, images: updated })); }}
                                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${isSelected ? 'bg-green-200 border border-green-500 text-green-900' : 'hover:bg-purple-100 border border-transparent'}`}
                                        >
                                          <a href={match.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-purple-700 hover:underline max-w-[100px] truncate">{match.source || match.title}</a>
                                          <span className={`font-bold ${isSelected ? 'text-green-800' : 'text-green-700'}`}>{isSelected ? '✓' : ''}{displayPrice}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Multi-Item results (compact) */}
                            {multiItemResults[index] && (
                              <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg text-xs space-y-1">
                                <div className="flex flex-wrap gap-2">
                                  {(multiItemResults[index].items || []).map((item, ii) => (
                                    <button key={ii} type="button"
                                      onClick={() => { const updated = [...formData.images]; updated[index] = { ...updated[index], price: item.estate_sale_price }; setFormData(prev => ({ ...prev, images: updated })); }}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${image.price === item.estate_sale_price ? 'bg-green-200 border-green-500 text-green-900' : 'border-teal-400 text-teal-800 hover:bg-teal-100'}`}
                                    >
                                      <span className="max-w-[120px] truncate">{item.label}</span>
                                      <span className="font-bold">{image.price === item.estate_sale_price ? '✓' : ''}${item.estate_sale_price}</span>
                                    </button>
                                  ))}
                                </div>
                                {multiItemResults[index].lot_price && (
                                  <button type="button"
                                    onClick={() => { const updated = [...formData.images]; updated[index] = { ...updated[index], price: multiItemResults[index].lot_price }; setFormData(prev => ({ ...prev, images: updated })); }}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] ${image.price === multiItemResults[index].lot_price ? 'bg-green-200 border-green-500 text-green-900' : 'border-teal-400 text-teal-800 hover:bg-teal-100'}`}
                                  >Lot: {image.price === multiItemResults[index].lot_price ? '✓' : ''}${multiItemResults[index].lot_price}</button>
                                )}
                              </div>
                            )}

                            {/* Loading indicator for deep price */}
                            {regeneratingPrice[index] && (
                              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
                                <span className="text-blue-700">Searching market prices...</span>
                              </div>
                            )}

                            {/* Deep Search Results button */}
                            {photoPricing[image.url] && (
                              <button type="button" onClick={() => setSelectedPricingImage(image.url)}
                                className="p-2 bg-orange-50 border border-orange-200 rounded-lg w-full text-left hover:bg-orange-100 text-xs"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-orange-600 font-medium">Deep Search: Avg ${photoPricing[image.url].average_price}</span>
                                  <span className="text-orange-600">View →</span>
                                </div>
                              </button>
                            )}

                            {/* Action buttons — 2-col grid on mobile, 4-col on desktop */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                              {!(image.name && image.description) && !image.skip_item && !image.skip_serp_search && image.serp_search_status !== 'do_not_search' && (
                               <Button type="button" variant="outline" size="sm" className="text-xs border-purple-400 text-purple-700 hover:bg-purple-50" onClick={() => handleSerpSearch(index)} disabled={serpSearching[index]}>
                                 <Scan className="w-3 h-3 mr-1" />{serpSearching[index] ? '...' : 'AI Search'}
                               </Button>
                              )}
                              <Button type="button" size="sm" className="text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSaveImage(index)} disabled={savingImageIndex === index}>
                                {savingImageIndex === index ? 'Saving...' : '💾 Save'}
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="text-xs border-teal-500 text-teal-700 hover:bg-teal-50" onClick={() => handleMultiItemAssess(index)} disabled={multiItemAssessing[index] || image.skip_item || image.skip_serp_search || image.serp_search_status === 'do_not_search'}>
                               <Brain className="w-3 h-3 mr-1" />{multiItemAssessing[index] ? '...' : 'AI Pricing Multi-Items'}
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(image.url)}`, '_blank')}>
                                Google Lens
                              </Button>
                              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => handleRegenerateDescription(index)} disabled={regeneratingDesc[index] || image.skip_item || image.skip_serp_search || image.serp_search_status === 'do_not_search'}>
                               {regeneratingDesc[index] ? '...' : 'AI Description'}
                              </Button>
                            </div>
                          </div>}
                          </div>
                          </div>)}
                              </Card>
                       );
                    })}
                    </div>

                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}