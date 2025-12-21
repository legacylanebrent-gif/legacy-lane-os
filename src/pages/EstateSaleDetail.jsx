import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import MessageModal from '@/components/messaging/MessageModal';
import NotificationsDropdown from '@/components/notifications/NotificationsDropdown';
import { 
  MapPin, Calendar, Clock, Heart, Share2, Phone, Globe,
  Building2, DollarSign, CreditCard, ArrowLeft, User, ChevronLeft, ChevronRight, MessageSquare, LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function EstateSaleDetail() {
  const [sale, setSale] = useState(null);
  const [operator, setOperator] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savedImages, setSavedImages] = useState([]);
  const [isInRoute, setIsInRoute] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  useEffect(() => {
    loadSaleData();
  }, []);

  const loadSaleData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const saleId = urlParams.get('id');

      if (!saleId) {
        window.location.href = createPageUrl('Home');
        return;
      }

      // Load current user
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Check if sale is in route
        const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
        setIsInRoute(route.includes(saleId));
      } catch (error) {
        // User not logged in
      }

      const saleData = await base44.entities.EstateSale.list();
      const foundSale = saleData.find(s => s.id === saleId);

      if (!foundSale) {
        window.location.href = createPageUrl('Home');
        return;
      }

      setSale(foundSale);

      // Try to load operator info
      if (foundSale.operator_id) {
        try {
          const users = await base44.entities.User.list();
          const operatorData = users.find(u => u.id === foundSale.operator_id);
          setOperator(operatorData);
        } catch (error) {
          console.log('Could not load operator info');
        }
      }

      // Increment view count
      try {
        await base44.entities.EstateSale.update(foundSale.id, {
          views: (foundSale.views || 0) + 1
        });
      } catch (error) {
        console.log('Could not update view count');
      }
    } catch (error) {
      console.error('Error loading sale:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaved(!saved);
    if (!saved && sale) {
      try {
        await base44.entities.EstateSale.update(sale.id, {
          saves: (sale.saves || 0) + 1
        });
      } catch (error) {
        console.log('Could not update save count');
      }
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: sale.title,
          text: `Check out this estate sale: ${sale.title}`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      // Fallback to clipboard if share fails
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (clipboardError) {
        console.log('Share cancelled or failed');
      }
    }
  };

  const handleAddToCalendar = () => {
    if (!sale.sale_dates || sale.sale_dates.length === 0) return;
    
    const firstDate = sale.sale_dates[0];
    const startDate = new Date(firstDate.date + 'T' + convertTo24Hour(firstDate.start_time));
    const endDate = new Date(firstDate.date + 'T' + convertTo24Hour(firstDate.end_time));
    
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${sale.title}
DESCRIPTION:Estate Sale at ${sale.property_address?.street || ''}
LOCATION:${sale.property_address?.formatted_address || ''}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sale.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertTo24Hour = (time12h) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') hours = '00';
    if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
    return `${hours.padStart(2, '0')}:${minutes || '00'}:00`;
  };

  const handleMessageOperator = () => {
    setMessageModalOpen(true);
  };

  const handleAddToRoute = () => {
    const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
    if (isInRoute) {
      const updated = route.filter(id => id !== sale.id);
      localStorage.setItem('estateRoute', JSON.stringify(updated));
      setIsInRoute(false);
      alert('Removed from route');
    } else {
      route.push(sale.id);
      localStorage.setItem('estateRoute', JSON.stringify(route));
      setIsInRoute(true);
      alert('Added to route');
    }
  };

  const toggleImageSave = (index) => {
    setSavedImages(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-600 text-xl">Loading...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
        <div className="text-slate-600 text-xl">Sale not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">LL</span>
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-slate-900">Legacy Lane</h1>
                <p className="text-xs text-orange-600">Estate Sale Finder</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {currentUser && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = createPageUrl('Dashboard')}
                    title="Dashboard"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.location.href = createPageUrl('Messages')}
                    title="Messages"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  <NotificationsDropdown user={currentUser} />
                </>
              )}
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to All Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Status */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">
                    {sale.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <Badge variant={sale.status === 'active' ? 'default' : 'secondary'} className="bg-green-600">
                      {sale.status === 'active' ? 'Happening Now' : 'Upcoming'}
                    </Badge>
                    {sale.national_featured && (
                      <Badge className="bg-orange-600">National Featured</Badge>
                    )}
                    {sale.local_featured && (
                      <Badge className="bg-cyan-600">Local Featured</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="w-5 h-5" />
                  </Button>
                  {currentUser && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleAddToCalendar}
                        title="Add to Calendar"
                      >
                        <Calendar className="w-5 h-5" />
                      </Button>
                      <Button
                        variant={isInRoute ? 'default' : 'outline'}
                        size="icon"
                        onClick={handleAddToRoute}
                        className={isInRoute ? 'bg-cyan-600 hover:bg-cyan-700' : ''}
                        title={isInRoute ? 'In Route' : 'Add to Route'}
                      >
                        <MapPin className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSave}
                        className={saved ? 'text-red-600' : ''}
                      >
                        <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {sale.views || 0} views
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {sale.saves || 0} saved
                </span>
              </div>
            </div>

            {/* Image Gallery */}
            {sale.images && sale.images.length > 0 && (
              <>
                <Card>
                  <CardContent className="p-0">
                    <div 
                      className="aspect-video bg-slate-100 overflow-hidden rounded-t-lg relative group cursor-pointer"
                      onClick={() => setModalOpen(true)}
                    >
                      <img
                        src={typeof sale.images[selectedImage] === 'string' ? sale.images[selectedImage] : sale.images[selectedImage]?.url}
                        alt={sale.title}
                        className="w-full h-full object-cover"
                      />
                      {currentUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleImageSave(selectedImage);
                          }}
                          className="absolute top-4 right-4 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                        >
                          <Heart 
                            className={`w-6 h-6 ${savedImages.includes(selectedImage) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} 
                          />
                        </button>
                      )}
                      {sale.images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(prev => prev === 0 ? sale.images.length - 1 : prev - 1);
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft className="w-6 h-6 text-slate-900" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(prev => prev === sale.images.length - 1 ? 0 : prev + 1);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="w-6 h-6 text-slate-900" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="p-4 grid grid-cols-6 gap-2">
                    {sale.images.map((image, index) => (
                      <div key={index} className="relative">
                        <button
                          onClick={() => setSelectedImage(index)}
                          className={`w-full aspect-square rounded-lg overflow-hidden border-2 ${
                            selectedImage === index ? 'border-orange-600' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={typeof image === 'string' ? image : image?.url}
                            alt={`View ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </button>
                        {currentUser && savedImages.includes(index) && (
                          <div className="absolute top-1 right-1">
                            <Heart className="w-4 h-4 fill-red-600 text-red-600" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Image Modal */}
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
                  <div className="relative flex items-center justify-center bg-black min-h-[90vh]">
                    <img
                      src={typeof sale.images[selectedImage] === 'string' ? sale.images[selectedImage] : sale.images[selectedImage]?.url}
                      alt={sale.title}
                      className="max-h-[90vh] max-w-full object-contain"
                    />
                    {currentUser && (
                      <button
                        onClick={() => toggleImageSave(selectedImage)}
                        className="absolute top-4 right-4 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                      >
                        <Heart 
                          className={`w-6 h-6 ${savedImages.includes(selectedImage) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} 
                        />
                      </button>
                    )}
                    {sale.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImage(prev => prev === 0 ? sale.images.length - 1 : prev - 1)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all"
                        >
                          <ChevronLeft className="w-6 h-6 text-slate-900" />
                        </button>
                        <button
                          onClick={() => setSelectedImage(prev => prev === sale.images.length - 1 ? 0 : prev + 1)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all"
                        >
                          <ChevronRight className="w-6 h-6 text-slate-900" />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                      {selectedImage + 1} / {sale.images.length}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
            )}

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">About This Sale</h3>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                  {sale.description || 'No description provided.'}
                </p>
              </CardContent>
            </Card>

            {/* Categories */}
            {sale.categories && sale.categories.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">What's Available</h3>
                  <div className="flex flex-wrap gap-2">
                    {sale.categories.map((cat, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm py-1.5 px-3">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {sale.location && sale.location.lat && sale.location.lng && (
              <Card>
                <CardContent className="p-0">
                  <MapContainer
                    center={[sale.location.lat, sale.location.lng]}
                    zoom={15}
                    style={{ height: '300px', width: '100%' }}
                    className="rounded-lg"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[sale.location.lat, sale.location.lng]}>
                      <Popup>{sale.title}</Popup>
                    </Marker>
                  </MapContainer>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {(sale.parking_info || sale.special_notes) && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  {sale.parking_info && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Parking Information</h4>
                      <p className="text-slate-700">{sale.parking_info}</p>
                    </div>
                  )}
                  {sale.special_notes && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Special Notes</h4>
                      <p className="text-slate-700">{sale.special_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Sale Details */}
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-cyan-600" />
                    Location
                  </h3>
                  {sale.property_address && (
                    <a
                      href={`https://maps.google.com/maps?q=${encodeURIComponent(
                        `${sale.property_address.street}, ${sale.property_address.city}, ${sale.property_address.state} ${sale.property_address.zip}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      {sale.property_address.street}<br />
                      {sale.property_address.city}, {sale.property_address.state} {sale.property_address.zip}
                    </a>
                  )}
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Sale Dates & Times
                  </h3>
                  <div className="space-y-3">
                    {sale.sale_dates && sale.sale_dates.map((dateInfo, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <div className="font-semibold text-slate-900">
                          {format(new Date(dateInfo.date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          {dateInfo.start_time} - {dateInfo.end_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Methods */}
                {sale.payment_methods && sale.payment_methods.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      Payment Methods
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {sale.payment_methods.map((method, idx) => (
                        <Badge key={idx} variant="outline" className="capitalize">
                          {method.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estimated Value - Only visible to operator */}
                {sale.estimated_value && currentUser?.id === sale.operator_id && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Estimated Value
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      ${sale.estimated_value.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Photos */}
            {currentUser && savedImages.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600 fill-red-600" />
                    Saved Photos ({savedImages.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {savedImages.map((imageIndex) => (
                      <button
                        key={imageIndex}
                        onClick={() => {
                          setSelectedImage(imageIndex);
                          setModalOpen(true);
                        }}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-red-600 transition-colors group"
                      >
                        <img
                          src={typeof sale.images[imageIndex] === 'string' ? sale.images[imageIndex] : sale.images[imageIndex]?.url}
                          alt={`Saved photo ${imageIndex + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operator Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  {operator?.company_name || sale.operator_name || 'Estate Sale Operator'}
                </h3>

                {operator?.company_description && (
                  <p className="text-sm text-slate-600 mb-4">{operator.company_description}</p>
                )}

                <div className="space-y-3">
                  {operator?.phone && (
                    <a
                      href={`tel:${operator.phone}`}
                      className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                    >
                      <Phone className="w-4 h-4" />
                      {operator.phone}
                    </a>
                  )}
                  {operator?.company_website && (
                    <a
                      href={operator.company_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      <Globe className="w-4 h-4" />
                      Company Website
                    </a>
                  )}
                </div>

                {currentUser && (
                  <Button 
                    onClick={handleMessageOperator}
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message Operator
                  </Button>
                )}
                {!currentUser && (
                  <Button 
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                  >
                    Sign In to Contact
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {currentUser && operator && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          recipient={operator}
          relatedEntity={{ type: 'EstateSale', id: sale.id, title: sale.title }}
          savedImages={savedImages}
          allImages={sale.images}
        />
      )}
    </div>
  );
}