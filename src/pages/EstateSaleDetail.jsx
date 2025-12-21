import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, Clock, DollarSign, Share2, Bookmark, 
  Phone, Mail, ExternalLink, Navigation, Heart, ChevronLeft,
  ChevronRight, X, User, CreditCard, Banknote, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EstateSaleDetail() {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSale();
  }, []);

  const loadSale = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const saleId = urlParams.get('id');
      
      if (!saleId) {
        alert('No estate sale ID provided');
        navigate(createPageUrl('EstateSaleFinder'));
        return;
      }

      const saleData = await base44.asServiceRole.entities.EstateSale.list();
      const foundSale = saleData.find(s => s.id === saleId);
      
      if (!foundSale) {
        alert('Estate sale not found');
        navigate(createPageUrl('EstateSaleFinder'));
        return;
      }

      setSale(foundSale);
      
      // Increment view count
      await base44.asServiceRole.entities.EstateSale.update(saleId, {
        views: (foundSale.views || 0) + 1
      });
    } catch (error) {
      console.error('Error loading estate sale:', error);
      alert('Failed to load estate sale');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sale) return;
    
    try {
      const newSavedState = !saved;
      setSaved(newSavedState);
      
      await base44.asServiceRole.entities.EstateSale.update(sale.id, {
        saves: sale.saves + (newSavedState ? 1 : -1)
      });
      
      setSale(prev => ({
        ...prev,
        saves: prev.saves + (newSavedState ? 1 : -1)
      }));
    } catch (error) {
      console.error('Error saving estate sale:', error);
      setSaved(!saved);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: sale.title,
          text: sale.description,
          url: url
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const getDirections = () => {
    const address = sale.property_address?.formatted_address || 
      `${sale.property_address?.street}, ${sale.property_address?.city}, ${sale.property_address?.state}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  const openLightbox = (index) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % sale.images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + sale.images.length) % sale.images.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading estate sale...</div>
      </div>
    );
  }

  if (!sale) return null;

  const nextSaleDate = sale.sale_dates?.[0];
  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Image Lightbox */}
      {lightboxOpen && sale.images?.length > 0 && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </Button>
          
          {sale.images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}
          
          <img
            src={sale.images[selectedImageIndex]}
            alt={`Photo ${selectedImageIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {selectedImageIndex + 1} / {sale.images.length}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('EstateSaleFinder'))}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Search
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Images & Description */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Image Gallery */}
            {sale.images && sale.images.length > 0 && (
              <Card className="overflow-hidden">
                <div className="relative">
                  <img
                    src={sale.images[selectedImageIndex]}
                    alt={sale.title}
                    className="w-full h-96 object-cover cursor-pointer"
                    onClick={() => openLightbox(selectedImageIndex)}
                  />
                  {sale.premium_listing && (
                    <Badge className="absolute top-4 left-4 bg-orange-600 text-white">
                      Premium Listing
                    </Badge>
                  )}
                  <Badge className={`absolute top-4 right-4 ${statusColors[sale.status]}`}>
                    {sale.status.replace('_', ' ')}
                  </Badge>
                  
                  {sale.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImageIndex + 1} / {sale.images.length}
                    </div>
                  )}
                </div>
                
                {sale.images.length > 1 && (
                  <div className="p-4 grid grid-cols-6 gap-2">
                    {sale.images.slice(0, 6).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className={`w-full h-20 object-cover rounded cursor-pointer border-2 ${
                          selectedImageIndex === idx ? 'border-orange-600' : 'border-transparent'
                        }`}
                        onClick={() => setSelectedImageIndex(idx)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Title and Actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
                  {sale.title}
                </h1>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <span className="text-lg">
                    {sale.property_address?.city}, {sale.property_address?.state}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSave}
                  className={saved ? 'bg-orange-50 border-orange-600 text-orange-600' : ''}
                >
                  {saved ? <Heart className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Categories */}
            {sale.categories && sale.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {sale.categories.map((category, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-slate-100">
                    {category}
                  </Badge>
                ))}
              </div>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <h2 className="text-2xl font-serif font-semibold">About This Sale</h2>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {sale.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>

            {/* Additional Information */}
            {(sale.parking_info || sale.special_notes) && (
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-serif font-semibold">Important Information</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sale.parking_info && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-600" />
                        Parking Information
                      </h3>
                      <p className="text-slate-600">{sale.parking_info}</p>
                    </div>
                  )}
                  
                  {sale.special_notes && (
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-orange-600" />
                        Special Notes
                      </h3>
                      <p className="text-slate-600">{sale.special_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{sale.views || 0}</div>
                    <div className="text-sm text-slate-600">Views</div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <div className="text-3xl font-bold text-orange-600">{sale.saves || 0}</div>
                    <div className="text-sm text-slate-600">Saves</div>
                  </div>
                  {sale.estimated_value && (
                    <>
                      <Separator orientation="vertical" className="h-12" />
                      <div>
                        <div className="text-3xl font-bold text-green-600">
                          ${(sale.estimated_value / 1000).toFixed(0)}K+
                        </div>
                        <div className="text-sm text-slate-600">Est. Value</div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details & Contact */}
          <div className="space-y-6">
            {/* Sale Dates & Times */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Sale Schedule
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {sale.sale_dates && sale.sale_dates.length > 0 ? (
                  sale.sale_dates.map((date, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                      <div className="font-semibold text-slate-900 mb-1">
                        {format(new Date(date.date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Clock className="w-4 h-4" />
                        {date.start_time} - {date.end_time}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-600">No dates scheduled yet</p>
                )}
              </CardContent>
            </Card>

            {/* Address & Map */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  Location
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {sale.property_address?.street}
                  </p>
                  <p className="text-slate-600">
                    {sale.property_address?.city}, {sale.property_address?.state} {sale.property_address?.zip}
                  </p>
                </div>
                
                <Button onClick={getDirections} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>

                {sale.location && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-slate-200">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.google.com/maps?q=${sale.location.lat},${sale.location.lng}&z=15&output=embed`}
                      allowFullScreen
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            {sale.payment_methods && sale.payment_methods.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                    Payment Methods
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {sale.payment_methods.map((method, idx) => (
                      <Badge key={idx} variant="outline" className="capitalize">
                        {method === 'credit_card' ? 'Credit Card' : method}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operator Info */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  Estate Sale Operator
                </h2>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-slate-900 mb-2">{sale.operator_name}</p>
                {sale.commission_rate && (
                  <p className="text-sm text-slate-600">
                    Commission Rate: {sale.commission_rate}%
                  </p>
                )}
              </CardContent>
            </Card>

            {/* CTA Button */}
            <Button className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg">
              <Bookmark className="w-5 h-5 mr-2" />
              {saved ? 'Saved to My List' : 'Save This Sale'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}