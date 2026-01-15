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
import { ArrowLeft, Plus, X, Camera, Sparkles, RotateCw, ImageIcon, Trash } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BatchPhotoGeneratorModal from '@/components/estate/BatchPhotoGeneratorModal';

const SALE_STATUSES = ['draft', 'upcoming', 'active', 'completed', 'cancelled'];

export default function SaleEditor() {
  const navigate = useNavigate();
  const [saleId, setSaleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [dateForm, setDateForm] = useState({ start_date: '', start_time: '', end_time: '' });
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [featured, setFeatured] = useState(false);
  const [photoTab, setPhotoTab] = useState('thumbnails');

  const [formData, setFormData] = useState({
      title: '',
      description: '',
      sale_type: '',
      status: 'draft',
      property_address: { street: '', city: '', state: '', zip: '' },
      sale_dates: [],
      images: [],
      categories: [],
      commission_rate: '',
      special_notes: ''
    });

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('saleId');
      console.log('SaleEditor mounted with saleId:', id);
      
      if (id) {
        setSaleId(id);
        await loadSale(id);
      } else {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const loadSale = async (id) => {
    try {
      const sales = await base44.entities.EstateSale.filter({ id });
      const saleData = sales[0];
      if (!saleData) throw new Error('Sale not found');
      console.log('Loaded sale data:', saleData);
      
      setFormData({
        title: saleData.title || '',
        description: saleData.description || '',
        sale_type: saleData.sale_type || '',
        status: saleData.status || 'draft',
        property_address: saleData.property_address || { street: '', city: '', state: '', zip: '' },
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
      setFeatured(saleData.national_featured || false);
    } catch (error) {
      console.error('Error loading sale:', error);
      alert('Error loading sale: ' + error.message);
    } finally {
      setLoading(false);
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
        newImages.push({
          url: file_url,
          name: '',
          description: ''
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
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
    if (!formData.title.trim()) {
      alert('Please enter a sale title');
      return;
    }
    if (!formData.property_address.city.trim()) {
      alert('Please enter a city');
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      const saveData = {
            title: formData.title,
            description: formData.description,
            sale_type: formData.sale_type,
            status: publish ? 'upcoming' : formData.status,
            property_address: {
              ...formData.property_address,
              formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
            },
            sale_dates: formData.sale_dates,
            images: formData.images.map(img => ({ ...img })),
            commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
            categories: formData.categories,
            special_notes: formData.special_notes,
            payment_methods: formData.payment_methods,
            national_featured: featured,
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
    if (!dateForm.start_date) {
      alert('Please enter a start date');
      return;
    }

    const newDate = {
      date: dateForm.start_date,
      start_time: dateForm.start_time || '',
      end_time: dateForm.end_time || ''
    };

    setFormData(prev => ({
      ...prev,
      sale_dates: [...prev.sale_dates, newDate]
    }));

    setDateForm({ start_date: '', start_time: '', end_time: '' });
  };

  const handleRemoveDate = (index) => {
    setFormData(prev => ({
      ...prev,
      sale_dates: prev.sale_dates.filter((_, i) => i !== index)
    }));
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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('MySales'))} className="text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-serif font-bold text-slate-900">{saleId ? 'Edit Sale' : 'Create New Sale'}</h1>
              <p className="text-sm text-slate-500">Fill in the details for your estate sale</p>
            </div>
          </div>
          <div className="flex gap-3">
            {saleId && (
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                <Trash className="w-4 h-4 mr-2" />
                Delete
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

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
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
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sale Type</Label>
                  <Select value={formData.sale_type} onValueChange={(value) => setFormData({...formData, sale_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
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
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, street: e.target.value}
                  })}
                />
              </div>
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
                <Label>State</Label>
                <Input
                  placeholder="TX"
                  value={formData.property_address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, state: e.target.value}
                  })}
                />
              </div>
              <div className="col-span-2">
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Date & Time</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateForm.start_date}
                  onChange={(e) => setDateForm({...dateForm, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="start-time">Daily Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={dateForm.start_time}
                  onChange={(e) => setDateForm({...dateForm, start_time: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end-time">Daily End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={dateForm.end_time}
                  onChange={(e) => setDateForm({...dateForm, end_time: e.target.value})}
                />
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
                          <p className="text-slate-600">
                            {saleDate.start_time} - {saleDate.end_time}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveDate(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Photos</h2>
            
            <div className="grid grid-cols-2 gap-3">
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
                <label htmlFor="camera-upload" className="cursor-pointer block">
                  <Camera className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-blue-900">Take Photos</p>
                </label>
              </div>
              <div className="border-2 border-dashed border-green-300 rounded-lg p-4 text-center bg-green-50">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploadingImages}
                />
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Plus className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-900">Choose Files</p>
                </label>
              </div>
            </div>

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
                  setFormData({...formData, images: items});
                }}>
                  <Droppable droppableId="images" direction="horizontal">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="grid grid-cols-4 gap-3"
                      >
                        {formData.images.map((image, index) => (
                          <Draggable key={index} draggableId={`image-${index}`} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="relative group rounded-lg overflow-hidden bg-slate-200 h-24"
                              >
                                <img
                                  src={image.url}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => setFormData({
                                    ...formData,
                                    images: formData.images.filter((_, i) => i !== index)
                                  })}
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
          </CardContent>
        </Card>

        {/* Featured Items */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Featured Items</h2>
              <Button variant="outline" size="sm" className="text-orange-600 border-orange-600">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Suggest
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Antique furniture, Vintage jewelry..."
                className="flex-1"
              />
              <Button variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.categories && formData.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.categories.map((category, index) => (
                  <Badge key={index} variant="outline" className="px-3 py-1">
                    {category}
                    <button
                      onClick={() => setFormData({
                        ...formData,
                        categories: formData.categories.filter((_, i) => i !== index)
                      })}
                      className="ml-2 text-slate-500 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sale Clients - Permissions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Sale Clients - Permissions</h2>
              <p className="text-sm text-slate-600">Manage page access permissions for assigned clients</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-blue-800">Clients are assigned to sales through the CRM. Use this panel to manage their page access permissions.</p>
            </div>
            <div className="text-center py-12">
              <p className="text-slate-500">No clients assigned to this sale</p>
            </div>
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
                    <Input
                      placeholder="e.g., Cash, Credit Card, Venmo..."
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        if (paymentMethodInput.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            payment_methods: [...(prev.payment_methods || []), paymentMethodInput.trim()]
                          }));
                          setPaymentMethodInput('');
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.payment_methods && formData.payment_methods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.payment_methods.map((method, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1">
                          {method}
                          <button
                            onClick={() => setFormData({
                              ...formData,
                              payment_methods: formData.payment_methods.filter((_, i) => i !== index)
                            })}
                            className="ml-2 text-slate-500 hover:text-slate-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 mb-2">Special Instructions</h3>
                  <Textarea
                    placeholder="Parking info, entry requirements, etc..."
                    value={formData.special_notes}
                    onChange={(e) => setFormData({...formData, special_notes: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div>
                    <h3 className="font-medium text-slate-900">Feature this sale</h3>
                    <p className="text-sm text-slate-600">Display prominently on the homepage</p>
                  </div>
                  <Switch
                    checked={featured}
                    onCheckedChange={setFeatured}
                  />
                </div>
              </div>
            </div>
            </CardContent>
            </Card>

            {/* Footer */}
        <div className="flex gap-3 justify-end pb-8">
          {saleId && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto">
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
  );
}