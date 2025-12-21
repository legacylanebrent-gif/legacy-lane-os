import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Upload, X, MapPin, DollarSign, Image as ImageIcon, Plus } from 'lucide-react';

const CATEGORIES = [
  'Furniture', 'Art & Collectibles', 'Jewelry', 'Antiques', 
  'Electronics', 'Home Decor', 'Kitchen & Dining', 'Tools & Equipment',
  'Books & Media', 'Clothing & Accessories', 'Outdoor & Garden', 'Other'
];

export default function CreateEstateSaleModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    sale_dates: [],
    status: 'draft',
    images: [],
    categories: [],
    estimated_value: '',
    commission_rate: '',
    special_notes: '',
    parking_info: '',
    payment_methods: ['cash', 'credit_card', 'venmo'],
    premium_listing: false
  });

  const [newDate, setNewDate] = useState({
    date: null,
    start_time: '9:00 AM',
    end_time: '5:00 PM'
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      });

      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
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
        operator_id: user.id,
        operator_name: user.full_name,
        status: publishNow ? 'upcoming' : 'draft',
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
        property_address: {
          ...formData.property_address,
          formatted_address: `${formData.property_address.street}, ${formData.property_address.city}, ${formData.property_address.state} ${formData.property_address.zip}`
        }
      };

      await base44.entities.EstateSale.create(data);
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating estate sale:', error);
      alert('Failed to create estate sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      property_address: { street: '', city: '', state: '', zip: '' },
      sale_dates: [],
      status: 'draft',
      images: [],
      categories: [],
      estimated_value: '',
      commission_rate: '',
      special_notes: '',
      parking_info: '',
      payment_methods: ['cash', 'credit_card', 'venmo'],
      premium_listing: false
    });
    setStep(1);
  };

  const canProceedToStep2 = formData.title && formData.property_address.street && 
    formData.property_address.city && formData.property_address.state;

  const canProceedToStep3 = formData.sale_dates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Estate Sale</DialogTitle>
        </DialogHeader>

        <Tabs value={step.toString()} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="1" onClick={() => setStep(1)}>Basic Info</TabsTrigger>
            <TabsTrigger value="2" disabled={!canProceedToStep2} onClick={() => setStep(2)}>Schedule</TabsTrigger>
            <TabsTrigger value="3" disabled={!canProceedToStep3} onClick={() => setStep(3)}>Details</TabsTrigger>
            <TabsTrigger value="4" disabled={!canProceedToStep3} onClick={() => setStep(4)}>Media</TabsTrigger>
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the estate sale, what items are available, and any special features..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Property Address *
                </Label>
                <Input
                  placeholder="Street Address"
                  value={formData.property_address.street}
                  onChange={(e) => setFormData({
                    ...formData,
                    property_address: {...formData.property_address, street: e.target.value}
                  })}
                />
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="premium_listing"
                  checked={formData.premium_listing}
                  onChange={(e) => setFormData({...formData, premium_listing: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="premium_listing" className="cursor-pointer">
                  Premium Listing (Featured placement)
                </Label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={() => setStep(4)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Continue to Media
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Estate Sale Photos
                </Label>
                <p className="text-sm text-slate-600 mb-3">Upload photos of featured items and the property</p>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImages}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">
                      {uploadingImages ? 'Uploading...' : 'Click to upload images or drag and drop'}
                    </p>
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={url} 
                          alt={`Estate sale ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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