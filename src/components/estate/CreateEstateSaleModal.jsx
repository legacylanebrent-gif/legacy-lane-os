import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SignTemplateModal from './SignTemplateModal';
import PhotoLabelingModal from './PhotoLabelingModal';
import BulkEditPhotosModal from './BulkEditPhotosModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Upload, X, MapPin, DollarSign, Image as ImageIcon, Plus, RotateCw, Edit2, Sparkles, GripVertical, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { STATE_REGIONS } from '@/components/data/StateRegions';

const CATEGORIES = [
  'Furniture', 'Art & Collectibles', 'Jewelry', 'Antiques', 
  'Electronics', 'Home Decor', 'Kitchen & Dining', 'Tools & Equipment',
  'Books & Media', 'Clothing & Accessories', 'Outdoor & Garden', 'Other'
];

export default function CreateEstateSaleModal({ open, onClose, onSuccess, sale }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showSignTemplate, setShowSignTemplate] = useState(false);
  const [operator, setOperator] = useState(null);
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      region: ''
    },
    location: null,
    sale_dates: [],
    status: 'draft',
    images: [],
    categories: [],
    estimated_value: '',
    commission_rate: '',
    special_notes: '',
    parking_info: '',
    payment_methods: ['cash', 'credit_card', 'venmo'],
    national_featured: false,
    local_featured: false,
    national_featured_price: '',
    local_featured_price: ''
  });

  const [editingImage, setEditingImage] = useState(null);
  const [labelingImage, setLabelingImage] = useState(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, successful: 0 });
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const [newDate, setNewDate] = useState({
    date: null,
    start_time: '9:00 AM',
    end_time: '5:00 PM'
  });

  useEffect(() => {
    loadOperator();
  }, []);

  const loadOperator = async () => {
    try {
      const userData = await base44.auth.me();
      setOperator(userData);
    } catch (error) {
      console.error('Error loading operator:', error);
    }
  };

  useEffect(() => {
    if (sale) {
      setFormData({
        title: sale.title || '',
        description: sale.description || '',
        property_address: sale.property_address || { street: '', city: '', state: '', zip: '', region: '' },
        location: sale.location || null,
        sale_dates: sale.sale_dates || [],
        status: sale.status || 'draft',
        images: (sale.images || []).map(url => ({ url, name: '', description: '', rotation: 0 })),
        categories: sale.categories || [],
        estimated_value: sale.estimated_value || '',
        commission_rate: sale.commission_rate || '',
        special_notes: sale.special_notes || '',
        parking_info: sale.parking_info || '',
        payment_methods: sale.payment_methods || ['cash', 'credit_card', 'venmo'],
        national_featured: sale.national_featured || false,
        local_featured: sale.local_featured || false,
        national_featured_price: sale.national_featured_price || '',
        local_featured_price: sale.local_featured_price || ''
      });
      setAddressInput(sale.property_address?.street || '');
    }
  }, [sale]);

  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [addressInput, setAddressInput] = useState('');

  useEffect(() => {
    if (!open || step !== 1) return;

    const loadGoogleMaps = async () => {
      try {
        if (window.google?.maps?.places) return;

        const response = await base44.functions.invoke('getConfig', {});
        const apiKey = response.data.GOOGLE_MAPS_API_KEY;

        if (!apiKey) return;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    loadGoogleMaps();
  }, [open, step]);

  const handleAddressSearch = async (input) => {
    setAddressInput(input);
    
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    if (!window.google?.maps?.places) return;

    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions(
      { input, types: ['address'] },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowPredictions(true);
        }
      }
    );
  };

  const handleSelectPrediction = async (placeId) => {
    if (!window.google?.maps?.places) return;

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails(
      {
        placeId,
        fields: ['address_components', 'geometry', 'formatted_address']
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          let street = '';
          let city = '';
          let state = '';
          let zip = '';

          place.address_components?.forEach((component) => {
            const types = component.types;
            
            if (types.includes('street_number')) {
              street = component.long_name + ' ';
            }
            if (types.includes('route')) {
              street += component.long_name;
            }
            if (types.includes('locality')) {
              city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
            if (types.includes('postal_code')) {
              zip = component.long_name;
            }
          });

          const location = place.geometry?.location ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : null;

          setFormData(prev => ({
            ...prev,
            property_address: {
              street: street.trim(),
              city,
              state,
              zip
            },
            location
          }));

          setAddressInput(street.trim());
          setShowPredictions(false);
        }
      }
    );
  };

  const processImage = async (file) => {
    return new Promise((resolve, reject) => {
      // Check file type
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Reject unsupported formats
      if (fileType === 'image/webp' || fileName.endsWith('.webp')) {
        reject(new Error('WebP format is not supported. Please convert to JPG or PNG first.'));
        return;
      }

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;
            const maxSize = 1200;

            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }
                const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg'
                });
                resolve(processedFile);
              },
              'image/jpeg',
              0.85
            );
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length, successful: 0 });

    const errors = [];

    try {
      const imageObjects = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          const processedFile = await processImage(file);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
          imageObjects.push({
            url: file_url,
            name: '',
            description: '',
            rotation: 0
          });
          setUploadProgress(prev => ({ ...prev, successful: prev.successful + 1 }));
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      if (imageObjects.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...imageObjects]
        }));
      }

      if (errors.length > 0) {
        alert(`Some files could not be uploaded:\n\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
      setUploadProgress({ current: 0, total: 0, successful: 0 });
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setSelectedImages(prev => prev.filter(i => i !== index));
  };

  const removeSelectedImages = () => {
    if (selectedImages.length === 0) return;
    if (!confirm(`Delete ${selectedImages.length} selected image(s)?`)) return;

    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => !selectedImages.includes(i))
    }));
    setSelectedImages([]);
  };

  const toggleImageSelection = (index) => {
    setSelectedImages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    // If dragging a selected item with multiple selections, move all selected items
    if (selectedImages.includes(sourceIndex) && selectedImages.length > 1) {
      const items = Array.from(formData.images);
      const selectedItems = selectedImages.sort((a, b) => a - b).map(idx => items[idx]);

      // Remove selected items from their current positions (in reverse order to maintain indices)
      selectedImages.sort((a, b) => b - a).forEach(idx => items.splice(idx, 1));

      // Insert all selected items at the destination
      let insertIndex = destIndex;
      // Adjust destination if we removed items before it
      const removedBefore = selectedImages.filter(idx => idx < destIndex).length;
      insertIndex -= removedBefore;

      items.splice(insertIndex, 0, ...selectedItems);

      setFormData(prev => ({ ...prev, images: items }));

      // Update selected indices
      const newIndices = selectedItems.map((_, i) => insertIndex + i);
      setSelectedImages(newIndices);
    } else {
      // Single item drag
      const items = Array.from(formData.images);
      const [reorderedItem] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, reorderedItem);

      setFormData(prev => ({ ...prev, images: items }));

      // Update selected indices if item was selected
      if (selectedImages.includes(sourceIndex)) {
        setSelectedImages([destIndex]);
      }
    }
  };

  const rotateImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => 
        i === index ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    }));
  };

  const updateImageDetails = (index, updates) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => 
        i === index ? { ...img, ...updates } : img
      )
    }));
  };

  const handlePhotoLabelApprove = (index, labelData, addedToInventory) => {
    updateImageDetails(index, {
      name: labelData.name,
      description: labelData.description,
      price: labelData.price,
      categories: labelData.categories
    });
    
    if (addedToInventory) {
      alert('Item added to inventory!');
    }
  };

  const handleBulkEdit = (updates) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, idx) => {
        if (!selectedImages.includes(idx)) return img;

        let updatedImg = { ...img };

        // Apply categories
        if (updates.categories) {
          const existingCategories = img.categories || [];
          updatedImg.categories = [...new Set([...existingCategories, ...updates.categories])];
        }

        // Apply price adjustment
        if (updates.priceAdjustment && img.price) {
          const currentPrice = parseFloat(img.price);
          const { type, value } = updates.priceAdjustment;
          
          switch (type) {
            case 'add':
              updatedImg.price = currentPrice + value;
              break;
            case 'subtract':
              updatedImg.price = Math.max(0, currentPrice - value);
              break;
            case 'set':
              updatedImg.price = value;
              break;
            case 'multiply':
              updatedImg.price = currentPrice * value;
              break;
          }
        }

        return updatedImg;
      })
    }));
  };



  const addSaleDate = () => {
    if (!newDate.date) return;

    setFormData(prev => ({
      ...prev,
      sale_dates: [...prev.sale_dates, {
        date: format(newDate.date, 'yyyy-MM-dd'),
        start_time: newDate.start_time,
        end_time: newDate.end_time
      }]
    }));

    setNewDate({
      date: null,
      start_time: '9:00 AM',
      end_time: '5:00 PM'
    });
  };

  const removeSaleDate = (index) => {
    setFormData(prev => ({
      ...prev,
      sale_dates: prev.sale_dates.filter((_, i) => i !== index)
    }));
  };

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const togglePaymentMethod = (method) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method]
    }));
  };

  const handleSubmit = async (publishNow = false) => {
    setLoading(true);
    try {
      const user = await base44.auth.me();

      const data = {
        ...formData,
        operator_id: sale?.operator_id || user.id,
        operator_name: sale?.operator_name || user.full_name,
        status: publishNow ? 'upcoming' : (sale?.status || 'draft'),
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        national_featured_price: formData.national_featured_price ? parseFloat(formData.national_featured_price) : null,
        local_featured_price: formData.local_featured_price ? parseFloat(formData.local_featured_price) : null,
        property_address: {
          ...formData.property_address,
          formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
        },
        images: formData.images.map(img => img.url)
      };

      if (sale?.id) {
        await base44.asServiceRole.entities.EstateSale.update(sale.id, data);
      } else {
        await base44.entities.EstateSale.create(data);
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving estate sale:', error);
      alert('Failed to save estate sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = async () => {
    if (!formData.title || !formData.property_address.street) {
      alert('Please enter a title and address first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const imageUrls = formData.images.slice(0, 5).map(img => img.url);
      const prompt = `You are writing a marketing description for an estate sale listing.

  Estate Sale Details:
  - Title: ${formData.title}
  - Location: ${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state}
  ${formData.categories.length > 0 ? `- Featured Categories: ${formData.categories.join(', ')}` : ''}
  ${imageUrls.length > 0 ? `- Photos of the estate sale items are attached for reference` : ''}

  Write a compelling 2-3 paragraph description for this estate sale that will attract potential buyers. Focus on:
  1. The overall estate sale event and what buyers can expect
  2. The types and quality of items available
  3. Why buyers should attend this sale

  Do not describe individual items in detail - focus on the overall estate sale experience and appeal.`;

      const requestParams = {
        prompt,
        add_context_from_internet: false
      };

      if (imageUrls.length > 0) {
        requestParams.file_urls = imageUrls;
      }

      const result = await base44.integrations.Core.InvokeLLM(requestParams);

      if (result && typeof result === 'string') {
        setFormData(prev => ({
          ...prev,
          description: result
        }));
      } else {
        throw new Error('Invalid response from AI');
      }
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Failed to generate description: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      property_address: { street: '', city: '', state: '', zip: '' },
      location: null,
      sale_dates: [],
      status: 'draft',
      images: [],
      categories: [],
      estimated_value: '',
      commission_rate: '',
      special_notes: '',
      parking_info: '',
      payment_methods: ['cash', 'credit_card', 'venmo'],
      national_featured: false,
      local_featured: false,
      national_featured_price: '',
      local_featured_price: ''
    });
    setStep(1);
  };

  const canProceedToStep2 = formData.title && formData.property_address.street && 
    formData.property_address.city && formData.property_address.state && formData.property_address.region;

  const canProceedToStep3 = formData.sale_dates.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"  onInteractOutside={(e) => {
        if (showPredictions) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between">
            <span>{sale?.id ? 'Edit Estate Sale' : 'Create Estate Sale'}</span>
            {sale?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignTemplate(true)}
              >
                Sign Templates
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <SignTemplateModal
          open={showSignTemplate}
          onClose={() => setShowSignTemplate(false)}
          sale={sale}
          operator={operator}
        />

        <PhotoLabelingModal
          open={labelingImage !== null}
          onClose={() => setLabelingImage(null)}
          image={labelingImage !== null ? formData.images[labelingImage] : null}
          imageIndex={labelingImage}
          saleId={sale?.id}
          onApprove={handlePhotoLabelApprove}
        />

        <BulkEditPhotosModal
          open={showBulkEdit}
          onClose={() => setShowBulkEdit(false)}
          selectedImages={selectedImages}
          images={formData.images}
          onApply={handleBulkEdit}
        />

        <Tabs value={step.toString()} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="1" onClick={() => setStep(1)}>Basic Info</TabsTrigger>
            <TabsTrigger value="2" disabled={!sale && !canProceedToStep2} onClick={() => setStep(2)}>Schedule</TabsTrigger>
            <TabsTrigger value="3" disabled={!sale && !canProceedToStep3} onClick={() => setStep(3)}>Media</TabsTrigger>
            <TabsTrigger value="4" disabled={!sale && !canProceedToStep3} onClick={() => setStep(4)}>Details</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="py-6 space-y-6">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="title">Sale Title *</Label>
                <Input
                  id="title"
                  placeholder="Estate Sale - Beautiful Family Home"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Property Address *
                </Label>
                <div className="relative">
                  <Input
                    ref={addressInputRef}
                    type="text"
                    placeholder="Start typing address..."
                    value={addressInput}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    onFocus={() => predictions.length > 0 && setShowPredictions(true)}
                  />
                  {showPredictions && predictions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {predictions.map((prediction) => (
                        <button
                          key={prediction.place_id}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-100 last:border-b-0 cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectPrediction(prediction.place_id);
                          }}
                        >
                          <div className="text-sm text-slate-900">{prediction.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="City"
                    value={formData.property_address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      property_address: {...formData.property_address, city: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="State"
                    value={formData.property_address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      property_address: {...formData.property_address, state: e.target.value}
                    })}
                  />
                  <Input
                    placeholder="ZIP"
                    value={formData.property_address.zip}
                    onChange={(e) => setFormData({
                      ...formData,
                      property_address: {...formData.property_address, zip: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="region">Sale Area/Region *</Label>
                <Select 
                  value={formData.property_address.region}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, region: value}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select the area for this sale" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.property_address.state && STATE_REGIONS[formData.property_address.state] ? (
                      <>
                        {STATE_REGIONS[formData.property_address.state].largerCities?.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Larger Cities</div>
                            {STATE_REGIONS[formData.property_address.state].largerCities.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </>
                        )}
                        {STATE_REGIONS[formData.property_address.state].smallerCities?.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500">Smaller Cities</div>
                            {STATE_REGIONS[formData.property_address.state].smallerCities.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="px-2 py-2 text-sm text-slate-500">
                        {formData.property_address.state ? 'No regions available for this state' : 'Please select a state first'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-600 mt-1">Select the area closest to your sale location</p>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedToStep2}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Continue to Schedule
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-4">
                <Label>Sale Dates & Times *</Label>
                
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newDate.date ? format(newDate.date, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newDate.date}
                            onSelect={(date) => setNewDate({...newDate, date})}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input
                          value={newDate.start_time}
                          onChange={(e) => setNewDate({...newDate, start_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input
                          value={newDate.end_time}
                          onChange={(e) => setNewDate({...newDate, end_time: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={addSaleDate} 
                    variant="outline" 
                    size="sm"
                    disabled={!newDate.date}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Date
                  </Button>
                </div>

                {formData.sale_dates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Scheduled Dates:</Label>
                    {formData.sale_dates.map((date, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="w-4 h-4 text-slate-600" />
                          <div>
                            <div className="font-medium">{format(new Date(date.date), 'MMMM d, yyyy')}</div>
                            <div className="text-sm text-slate-600">{date.start_time} - {date.end_time}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSaleDate(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={!canProceedToStep3}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Continue to Details
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Estate Sale Photos
                      {formData.images.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {formData.images.length} {formData.images.length === 1 ? 'photo' : 'photos'}
                        </Badge>
                      )}
                      {selectedImages.length > 0 && (
                        <Badge variant="default" className="ml-2 bg-orange-600">
                          {selectedImages.length} selected
                        </Badge>
                      )}
                    </Label>
                    <p className="text-sm text-slate-600">Drag to reorder • Click to select/deselect • Photos are resized for best online viewing</p>
                  </div>
                  <div className="flex gap-2">
                    {formData.images.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedImages.length === formData.images.length) {
                            setSelectedImages([]);
                          } else {
                            setSelectedImages(formData.images.map((_, idx) => idx));
                          }
                        }}
                        className="gap-2"
                      >
                        {selectedImages.length === formData.images.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                    {selectedImages.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkEdit(true)}
                          className="gap-2 text-orange-600 hover:text-orange-700"
                        >
                          <Edit2 className="w-4 h-4" />
                          Bulk Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeSelectedImages}
                          className="gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Selected
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center mb-4">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImages}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">
                      {uploadingImages ? 'Processing and uploading...' : 'Click to upload images (JPG, PNG, GIF)'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      WebP format not supported - please convert to JPG or PNG
                    </p>
                  </label>

                  {uploadingImages && uploadProgress.total > 0 && (
                    <div className="mt-4 space-y-2">
                      <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                      <p className="text-xs text-slate-600">
                        Processing {uploadProgress.current} of {uploadProgress.total} images... ({uploadProgress.successful} successful)
                      </p>
                    </div>
                  )}
                </div>

                {formData.images.length > 0 && (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="images" direction="horizontal">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-6 gap-3"
                        >
                          {formData.images.map((image, index) => (
                            <Draggable key={index} draggableId={`image-${index}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="space-y-2"
                                >
                                  <div 
                                    className={`relative group cursor-pointer rounded-lg ${
                                      selectedImages.includes(index) ? 'ring-4 ring-orange-500' : ''
                                    }`}
                                    onClick={(e) => {
                                      if (!snapshot.isDragging) {
                                        toggleImageSelection(index);
                                      }
                                    }}
                                  >
                                    <div {...provided.dragHandleProps} className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                                      <div className="bg-white/90 rounded p-1 shadow-sm">
                                        <GripVertical className="w-4 h-4 text-slate-600" />
                                      </div>
                                    </div>
                                    <img 
                                      src={image.url} 
                                      alt={image.name || `Photo ${index + 1}`}
                                      className="w-full h-32 object-cover rounded-lg"
                                      style={{ transform: `rotate(${image.rotation}deg)` }}
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button
                                       variant="secondary"
                                       size="sm"
                                       className="h-7 w-7 p-0 bg-purple-600 hover:bg-purple-700 text-white"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setLabelingImage(index);
                                       }}
                                       title="AI Label & Price"
                                     >
                                       <Sparkles className="w-3 h-3" />
                                     </Button>
                                     <Button
                                       variant="secondary"
                                       size="sm"
                                       className="h-7 w-7 p-0"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         rotateImage(index);
                                       }}
                                     >
                                       <RotateCw className="w-3 h-3" />
                                     </Button>
                                     <Button
                                       variant="secondary"
                                       size="sm"
                                       className="h-7 w-7 p-0"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setEditingImage(index);
                                       }}
                                     >
                                       <Edit2 className="w-3 h-3" />
                                     </Button>
                                     <Button
                                       variant="destructive"
                                       size="sm"
                                       className="h-7 w-7 p-0"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         removeImage(index);
                                       }}
                                     >
                                       <X className="w-3 h-3" />
                                     </Button>
                                    </div>
                                    {selectedImages.includes(index) && (
                                      <div className="absolute inset-0 bg-orange-500/20 rounded-lg pointer-events-none" />
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                   <Input
                                     placeholder="Photo name"
                                     value={image.name}
                                     onChange={(e) => updateImageDetails(index, { name: e.target.value })}
                                     onClick={(e) => e.stopPropagation()}
                                     className="text-xs"
                                   />
                                   {image.price && (
                                     <div className="text-xs font-semibold text-green-600">
                                       ${parseFloat(image.price).toFixed(2)}
                                     </div>
                                   )}
                                   {image.categories && image.categories.length > 0 && (
                                     <div className="flex flex-wrap gap-1">
                                       {image.categories.slice(0, 2).map((cat, i) => (
                                         <Badge key={i} className="text-xs py-0 px-1 bg-purple-100 text-purple-700">
                                           {cat}
                                         </Badge>
                                       ))}
                                       {image.categories.length > 2 && (
                                         <Badge className="text-xs py-0 px-1 bg-slate-100 text-slate-600">
                                           +{image.categories.length - 2}
                                         </Badge>
                                       )}
                                     </div>
                                   )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>

              {editingImage !== null && (
                <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">Edit Photo Details</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingImage(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={formData.images[editingImage]?.name || ''}
                      onChange={(e) => updateImageDetails(editingImage, { name: e.target.value })}
                      placeholder="e.g., Antique Dining Table"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={formData.images[editingImage]?.description || ''}
                      onChange={(e) => updateImageDetails(editingImage, { description: e.target.value })}
                      placeholder="Additional details about this item..."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Continue to Details
                </Button>
              </div>
            </>
          )}

              {step === 4 && (
              <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="description">Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateDescription}
                    disabled={generatingDescription}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {generatingDescription ? 'Generating...' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  id="description"
                  placeholder="Describe the estate sale, what items are available, and any special features..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div>
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={formData.categories.includes(category) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.categories.includes(category) 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'hover:bg-slate-100'
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_value">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Estimated Total Value
                  </Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    placeholder="50000"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.1"
                    placeholder="25"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({...formData, commission_rate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label>Payment Methods</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['cash', 'credit_card', 'venmo', 'paypal', 'zelle', 'check'].map(method => (
                    <Badge
                      key={method}
                      variant={formData.payment_methods.includes(method) ? 'default' : 'outline'}
                      className={`cursor-pointer ${
                        formData.payment_methods.includes(method) 
                          ? 'bg-cyan-600 hover:bg-cyan-700' 
                          : 'hover:bg-slate-100'
                      }`}
                      onClick={() => togglePaymentMethod(method)}
                    >
                      {method.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="parking_info">Parking Information</Label>
                <Textarea
                  id="parking_info"
                  placeholder="Street parking available, please park on the right side..."
                  value={formData.parking_info}
                  onChange={(e) => setFormData({...formData, parking_info: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="special_notes">Special Notes</Label>
                <Textarea
                  id="special_notes"
                  placeholder="Any special instructions, restrictions, or highlights..."
                  value={formData.special_notes}
                  onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <Label className="text-base font-semibold">Featured Listing Add-Ons (One-Time)</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="national_featured"
                        checked={formData.national_featured}
                        onChange={(e) => setFormData({...formData, national_featured: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="national_featured" className="cursor-pointer font-medium">
                        National Featured
                      </Label>
                    </div>
                    <p className="text-xs text-slate-600">Featured placement nationwide</p>
                    {formData.national_featured && (
                      <div>
                        <Label htmlFor="national_price" className="text-xs">Add-on Price ($)</Label>
                        <Input
                          id="national_price"
                          type="number"
                          step="0.01"
                          placeholder="299.00"
                          value={formData.national_featured_price}
                          onChange={(e) => setFormData({...formData, national_featured_price: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="local_featured"
                        checked={formData.local_featured}
                        onChange={(e) => setFormData({...formData, local_featured: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="local_featured" className="cursor-pointer font-medium">
                        Local Featured
                      </Label>
                    </div>
                    <p className="text-xs text-slate-600">Featured placement in local area</p>
                    {formData.local_featured && (
                      <div>
                        <Label htmlFor="local_price" className="text-xs">Add-on Price ($)</Label>
                        <Input
                          id="local_price"
                          type="number"
                          step="0.01"
                          placeholder="99.00"
                          value={formData.local_featured_price}
                          onChange={(e) => setFormData({...formData, local_featured_price: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Back
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button 
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? 'Publishing...' : 'Publish Now'}
                </Button>
              </div>
              </>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}