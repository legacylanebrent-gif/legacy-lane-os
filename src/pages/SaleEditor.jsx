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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft',
    property_address: { street: '', city: '', state: '', zip: '' },
    sale_dates: [],
    images: [],
    categories: [],
    estimated_value: '',
    commission_rate: '',
    special_notes: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('saleId');
    
    if (id) {
      setSaleId(id);
      loadSale(id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadSale = async (id) => {
    try {
      const saleData = await base44.entities.EstateSale.read(id);
      
      setFormData({
        title: saleData.title || '',
        description: saleData.description || '',
        status: saleData.status || 'draft',
        property_address: saleData.property_address || { street: '', city: '', state: '', zip: '' },
        sale_dates: saleData.sale_dates || [],
        images: (saleData.images || []).map(img => 
          typeof img === 'string' ? { url: img, name: '', description: '' } : img
        ),
        categories: saleData.categories || [],
        estimated_value: saleData.estimated_value || '',
        commission_rate: saleData.commission_rate || '',
        special_notes: saleData.special_notes || ''
      });
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
        status: publish ? 'upcoming' : formData.status,
        property_address: {
          ...formData.property_address,
          formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
        },
        images: formData.images.map(img => ({ ...img })),
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        categories: formData.categories,
        special_notes: formData.special_notes,
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
                <div>
                  <Label>Estimated Value</Label>
                  <Input
                    type="number"
                    placeholder="$0.00"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                  />
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