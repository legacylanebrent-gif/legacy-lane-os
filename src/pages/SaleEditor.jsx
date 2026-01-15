import React, { useState, useEffect } from 'react';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Plus, X, Upload, Camera, Sparkles, RotateCw, Trash2, Upload as UploadIcon, CalendarIcon, DollarSign, ImageIcon, Trash } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import BatchPhotoGeneratorModal from '@/components/estate/BatchPhotoGeneratorModal';
import AddressAutocomplete from '@/components/address/AddressAutocomplete';

const CATEGORIES = [
  'Furniture', 'Art & Collectibles', 'Jewelry', 'Antiques', 
  'Electronics', 'Home Decor', 'Kitchen & Dining', 'Tools & Equipment',
  'Books & Media', 'Clothing & Accessories', 'Outdoor & Garden', 'Other'
];

export default function SaleEditor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sale, setSale] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, successful: 0 });
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);

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
    local_featured_price: '',
    assigned_client_id: '',
    assigned_client_name: '',
    assigned_client_email: '',
    assigned_client_phone: ''
  });

  useEffect(() => {
    loadSale();
    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyCPPGWYI7pPqvykcKlKu9G5eI_q8tquVV4'}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const loadSale = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      if (saleId) {
        const saleData = await base44.entities.EstateSale.read(saleId);
        setSale(saleData);
        setFormData(prev => ({
          ...prev,
          ...saleData,
          property_address: saleData.property_address || prev.property_address,
          images: (saleData.images || []).map(img => 
            typeof img === 'string' ? { url: img, name: '', description: '', rotation: 0, price: '' } : img
          )
        }));
      }
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length, successful: 0 });

    try {
      const imageObjects = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        imageObjects.push({
          url: file_url,
          name: '',
          description: '',
          rotation: 0,
          price: ''
        });
        setUploadProgress(prev => ({ ...prev, successful: prev.successful + 1 }));

        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (imageObjects.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...imageObjects]
        }));
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images: ' + error.message);
    } finally {
      setUploadingImages(false);
      setUploadProgress({ current: 0, total: 0, successful: 0 });
      e.target.value = '';
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
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

  const handlePhotoUpdated = async (index, updatedPhoto) => {
    setFormData(prev => {
      const newImages = prev.images.map((img, i) => 
        i === index ? updatedPhoto : img
      );
      // Auto-save to database when photos are updated
      if (sale?.id) {
        base44.entities.EstateSale.update(sale.id, { images: newImages });
      }
      return { ...prev, images: newImages };
    });
  };

  const rotateImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => 
        i === index ? { ...img, rotation: (img.rotation + 90) % 360 } : img
      )
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({ ...prev, images: items }));
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    try {
      const user = await base44.auth.me();

      const data = {
        ...formData,
        operator_id: sale?.operator_id || user.id,
        operator_name: sale?.operator_name || user.full_name,
        status: publish ? 'upcoming' : (sale?.status || 'draft'),
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        national_featured_price: formData.national_featured_price ? parseFloat(formData.national_featured_price) : null,
        local_featured_price: formData.local_featured_price ? parseFloat(formData.local_featured_price) : null,
        images: formData.images.map(img => ({
          ...img,
          price: img.price ? parseFloat(img.price) : null
        })),
        property_address: {
          ...formData.property_address,
          formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
        }
      };

      if (sale?.id) {
        await base44.entities.EstateSale.update(sale.id, data);
      } else {
        const newSale = await base44.entities.EstateSale.create(data);
        setSale(newSale);
      }

      if (publish) {
        navigate(createPageUrl('MySales'));
      }
    } catch (error) {
      console.error('Error saving sale:', error);
      alert('Failed to save sale: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sale?.id) {
      alert('Cannot delete unsaved sale');
      return;
    }

    if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      setSaving(true);
      try {
        await base44.entities.EstateSale.delete(sale.id);
        navigate(createPageUrl('MySales'));
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Failed to delete sale: ' + error.message);
        setSaving(false);
      }
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-900">Edit Sale</h1>
              <p className="text-sm text-slate-500">Fill in the details for your estate sale</p>
            </div>
          </div>
          <div className="flex gap-3">
            {sale?.id && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={saving}
                className="mr-auto"
              >
                <Trash className="w-4 h-4 mr-2" />
                Delete Sale
              </Button>
            )}
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

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Sale Title *</Label>
                  <Input
                    id="title"
                    placeholder="Estate Sale - Beautiful Family Home"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sale Type</Label>
                    <Select defaultValue="estate">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estate">Estate Sale</SelectItem>
                        <SelectItem value="moving">Moving Sale</SelectItem>
                        <SelectItem value="liquidation">Liquidation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the estate sale..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Location</h2>
            <div>
              <Label>Street Address *</Label>
              <AddressAutocomplete
                value={formData.property_address.street}
                onChange={(val) => setFormData({
                  ...formData,
                  property_address: {...formData.property_address, street: val}
                })}
                onAddressSelect={(addressData) => setFormData({
                  ...formData,
                  property_address: {...formData.property_address, ...addressData}
                })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  placeholder="Austin"
                  value={formData.property_address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, city: e.target.value}
                  })}
                />
              </div>
              <div>
                <Label>State *</Label>
                <Input
                  placeholder="TX"
                  value={formData.property_address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, state: e.target.value}
                  })}
                />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input
                  placeholder="78701"
                  value={formData.property_address.zip}
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, zip: e.target.value}
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Date & Time</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Daily Start Time</Label>
                <Input type="time" />
              </div>
              <div>
                <Label>Daily End Time</Label>
                <Input type="time" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
            
            <div>
              <Label className="text-sm font-medium">Featured Image</Label>
              {formData.images.length > 0 ? (
                <div className="relative w-32 h-32 mt-2 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={formData.images[0].url}
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(0)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center mt-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Upload photos below</p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Gallery Photos</Label>

              <Tabs defaultValue="thumbnails" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="thumbnails">Thumbnails</TabsTrigger>
                  <TabsTrigger value="details">Descriptions & Pricing</TabsTrigger>
                </TabsList>

                <TabsContent value="thumbnails" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center bg-blue-50">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="camera-upload"
                        disabled={uploadingImages}
                        multiple
                      />
                      <label htmlFor="camera-upload" className="cursor-pointer">
                        <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-blue-900">Take Photo</p>
                      </label>
                    </div>

                    <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center bg-green-50">
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
                        <UploadIcon className="w-10 h-10 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-medium text-green-900">Choose Files</p>
                      </label>
                    </div>
                  </div>

                  {uploadingImages && uploadProgress.total > 0 && (
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                      <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                      <p className="text-xs text-slate-600 text-center">
                        Processing {uploadProgress.current} of {uploadProgress.total}...
                      </p>
                    </div>
                  )}

                  {formData.images.length > 1 && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="images" direction="horizontal">
                        {(provided) => (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className="grid grid-cols-4 gap-3"
                          >
                            {formData.images.slice(1).map((image, index) => (
                              <Draggable key={index + 1} draggableId={`image-${index + 1}`} index={index + 1}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="relative group rounded-lg overflow-hidden bg-slate-200"
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Photo ${index + 2}`}
                                      className="w-full h-24 object-cover"
                                      style={{ transform: `rotate(${image.rotation}deg)` }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 px-2"
                                        onClick={() => rotateImage(index + 1)}
                                      >
                                        <RotateCw className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 px-2"
                                        onClick={() => removeImage(index + 1)}
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
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
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="font-medium text-slate-900">Photo Titles & Descriptions</h3>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="border-orange-500 text-orange-600"
                       onClick={() => setShowGeneratorModal(true)}
                       disabled={formData.images.length === 0}
                     >
                       <Sparkles className="w-3 h-3 mr-1" />
                       Generate Titles
                     </Button>
                   </div>
                   {formData.images.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No photos uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="border rounded-lg p-4 flex gap-4">
                          <img src={image.url} alt={`Photo ${index + 1}`} className="w-24 h-32 object-cover rounded flex-shrink-0" />
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="col-span-2">
                                <Label className="text-xs text-slate-600">Title</Label>
                                <Input
                                  value={image.name}
                                  onChange={(e) => updateImageDetails(index, { name: e.target.value })}
                                  placeholder="Title"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600">Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={image.price || ''}
                                  onChange={(e) => updateImageDetails(index, { price: e.target.value })}
                                  placeholder="$0.00"
                                  className="text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Description</Label>
                              <Textarea
                                value={image.description}
                                onChange={(e) => updateImageDetails(index, { description: e.target.value })}
                                placeholder="Description"
                                className="text-sm resize-none"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Featured Items */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Featured Items</h2>
              <Button size="sm" variant="outline" className="border-orange-500 text-orange-600">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Suggest
              </Button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="e.g., Antique furniture, Vintage jewelry..." />
              <Button size="icon"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Vintage Comics Collection <X className="w-3 h-3 ml-1 cursor-pointer" /></Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Special Instructions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Payment & Special Instructions</h2>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Accepted Payment Methods</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g., Cash, Credit Card, Venmo..." />
                <Button size="icon"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">Cash <X className="w-3 h-3 ml-1 cursor-pointer" /></Badge>
                <Badge variant="secondary">Credit Card <X className="w-3 h-3 ml-1 cursor-pointer" /></Badge>
              </div>
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Textarea
                placeholder="Parking info, entry requirements, etc."
                value={formData.special_notes}
                onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="font-medium">Feature this sale</Label>
                <p className="text-sm text-slate-600">Display prominently on the homepage</p>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Footer Buttons */}
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

      <BatchPhotoGeneratorModal
        open={showGeneratorModal}
        onClose={() => setShowGeneratorModal(false)}
        images={formData.images}
        onPhotosUpdated={handlePhotoUpdated}
      />
    </div>
  );
}