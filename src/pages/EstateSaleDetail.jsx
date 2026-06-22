import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getImageSrc } from '@/utils/imageOptimizer';
import { formatPhone } from '@/utils/formatPhone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import MessageModal from '@/components/messaging/MessageModal';

import SharedFooter from '@/components/layout/SharedFooter';
import SignTheListButton from '@/components/estate/SignTheListButton';
import ShareModal from '@/components/share/ShareModal';
import { 
  MapPin, Calendar, Clock, Heart, Share2, Phone, Globe,
  Building2, DollarSign, CreditCard, ArrowLeft, User, ChevronLeft, ChevronRight, MessageSquare, LayoutDashboard, ShoppingBag, LogIn, LogOut, Eye, EyeOff, Search
} from 'lucide-react';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';
import { format } from 'date-fns';
import { useSEO } from '@/hooks/useSEO';
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
  const [saved, setSaved] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const saleId = urlParams.get('id');
    const savedSales = JSON.parse(localStorage.getItem('savedSales') || '[]');
    return savedSales.includes(saleId);
  });
  const [savedImages, setSavedImages] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const saleId = urlParams.get('id');
    const stored = localStorage.getItem(`savedImages_${saleId}`);
    return stored ? JSON.parse(stored) : [];
  });
  const [showImageDescription, setShowImageDescription] = useState(true);
  const [isInRoute, setIsInRoute] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [visibleThumbnails, setVisibleThumbnails] = useState(20);
  const [isFollowingCompany, setIsFollowingCompany] = useState(false);
  const [followingCompany, setFollowingCompany] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [wantedItemTitle, setWantedItemTitle] = useState('');
  const [contactBuyer, setContactBuyer] = useState(null);

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

      // Check authentication
      let authUser = null;
      try {
        const authenticated = await base44.auth.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          authUser = await base44.auth.me();
          setCurrentUser(authUser);
          
          // Check if sale is in route
          const route = JSON.parse(localStorage.getItem('estateRoute') || '[]');
          setIsInRoute(route.includes(saleId));
        }
      } catch (error) {
        console.log('User not logged in');
      }

      // Fetch only this specific sale
      const sales = await base44.entities.EstateSale.filter({ id: saleId }, undefined, 1);
      const foundSale = sales[0];

      if (!foundSale) {
        window.location.href = createPageUrl('Home');
        return;
      }

      setSale(foundSale);

      // Try to load Estate Sale Company Owner info and check follow status
      if (foundSale.operator_id) {
        // Load operator info (may fail for non-admin users — that's fine)
        try {
          const users = await base44.entities.User.list();
          const operatorData = users.find(u => u.id === foundSale.operator_id);
          setOperator(operatorData);
        } catch (error) {
          console.log('Could not load Estate Sale Company Owner info');
        }

        // Check if user already follows this company — separate from operator load
        try {
          const authCheck = await base44.auth.isAuthenticated();
          if (authCheck) {
            const me = await base44.auth.me();
            const existing = await base44.entities.CompanyFollow.filter({
              consumer_user_id: me.id,
              operator_id: foundSale.operator_id
            });
            setIsFollowingCompany(existing.length > 0);
          }
        } catch (error) {
          console.log('Could not check follow status');
        }

        // Auto-open message modal if coming from ISO match notification
        const autoMessage = urlParams.get('autoMessage');
        const wantedTitle = urlParams.get('wantedItemTitle');
        const contactBuyerId = urlParams.get('contactBuyerId');
        const contactBuyerName = urlParams.get('contactBuyerName');
        if (autoMessage === '1' && authUser) {
          if (wantedTitle) setWantedItemTitle(decodeURIComponent(wantedTitle));
          if (contactBuyerId) {
            // Operator clicking a buyer hunt notification — store buyer info for message modal
            setWantedItemTitle(decodeURIComponent(contactBuyerName || 'Buyer'));
            setContactBuyer({ id: contactBuyerId, full_name: decodeURIComponent(contactBuyerName || 'Buyer') });
          }
          setMessageModalOpen(true);
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
    if (!currentUser) {
      // Redirect to login if not authenticated
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const savedSales = JSON.parse(localStorage.getItem('savedSales') || '[]');
    
    if (saved) {
      // Remove from saved
      const updated = savedSales.filter(id => id !== sale.id);
      localStorage.setItem('savedSales', JSON.stringify(updated));
      setSaved(false);
      
      // Remove connection
      try {
        const connections = await base44.entities.Connection.filter({
          connected_user_id: currentUser.id,
          account_owner_id: sale.operator_id,
          source: sale.id
        });
        if (connections.length > 0) {
          await base44.entities.Connection.delete(connections[0].id);
        }
      } catch (error) {
        console.log('Could not remove connection');
      }
    } else {
      // Add to saved
      savedSales.push(sale.id);
      localStorage.setItem('savedSales', JSON.stringify(savedSales));
      setSaved(true);
      
      // Update save count
      try {
        await base44.entities.EstateSale.update(sale.id, {
          saves: (sale.saves || 0) + 1
        });
      } catch (error) {
        console.log('Could not update save count');
      }
      
      // Create connection
      if (sale.operator_id) {
        try {
          await base44.entities.Connection.create({
            account_owner_id: sale.operator_id,
            account_owner_type: 'estate_sale_operator',
            connected_user_id: currentUser.id,
            connected_user_name: currentUser.full_name,
            connected_user_email: currentUser.email,
            connected_user_phone: currentUser.phone || '',
            connection_type: 'favorite',
            source: sale.id
          });
        } catch (connError) {
          console.log('Connection already exists or could not create:', connError);
        }
      }
    }
  };

  const handleShare = () => {
    setShareModalOpen(true);
  };

  const convertTo24Hour = (time12h) => {
    if (!time12h) return '00:00:00';
    
    // Handle if already in 24-hour format (e.g., "14:00")
    if (!time12h.includes('AM') && !time12h.includes('PM') && !time12h.includes('am') && !time12h.includes('pm')) {
      const [hours, minutes] = time12h.split(':');
      return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}:00`;
    }
    
    // Handle 12-hour format
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    hours = hours || '12';
    minutes = minutes || '00';
    
    if (modifier && modifier.toUpperCase() === 'PM' && hours !== '12') {
      hours = String(parseInt(hours, 10) + 12);
    } else if (modifier && modifier.toUpperCase() === 'AM' && hours === '12') {
      hours = '00';
    }
    
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  };

  const convertTo12Hour = (time24h) => {
    if (!time24h) return '';
    const [hours, minutes] = time24h.split(':');
    let hour = parseInt(hours, 10);
    const modifier = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minutes} ${modifier}`;
  };

  const handleMessageOperator = () => {
    setMessageModalOpen(true);
  };

  const handleFollowCompany = async () => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setFollowingCompany(true);
    try {
      if (isFollowingCompany) {
        const existing = await base44.entities.CompanyFollow.filter({
          consumer_user_id: currentUser.id,
          operator_id: sale.operator_id
        });
        if (existing.length > 0) await base44.entities.CompanyFollow.delete(existing[0].id);
        setIsFollowingCompany(false);
        alert('Unfollowed company.');
      } else {
        await base44.entities.CompanyFollow.create({
          consumer_user_id: currentUser.id,
          operator_id: sale.operator_id,
          operator_name: operator?.company_name || operator?.full_name || sale.operator_name || '',
          operator_city: operator?.address_city || operator?.city || '',
          operator_state: operator?.address_state || operator?.state || '',
          notify_email: true,
          notify_sms: false,
          notify_inapp: true,
          auto_favorite: false
        });
        setIsFollowingCompany(true);
        alert('✅ Company followed! Visit "Favorite Companies" in your menu to manage your followed companies.');
      }
    } catch (err) {
      console.error('Error toggling company follow:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setFollowingCompany(false);
    }
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

  const handleSearch = (e) => {
    const q = e?.target?.value || '';
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const term = q.toLowerCase();
    const results = [];
    // Search title & description
    if (sale.title?.toLowerCase().includes(term)) results.push({ type: 'Title', text: sale.title });
    if (sale.description?.toLowerCase().includes(term)) results.push({ type: 'Description', text: sale.description.slice(0, 200) + (sale.description.length > 200 ? '...' : '') });
    // Search categories
    (sale.categories || []).forEach(c => { if (c.toLowerCase().includes(term)) results.push({ type: 'Category', text: c }); });
    // Search images (name & description)
    (sale.images || []).forEach((img, i) => {
      const name = typeof img === 'object' ? img.name : '';
      const desc = typeof img === 'object' ? img.description : '';
      if (name?.toLowerCase().includes(term)) results.push({ type: `Photo ${i + 1} Name`, text: name, imageIndex: i });
      if (desc?.toLowerCase().includes(term)) results.push({ type: `Photo ${i + 1} Description`, text: desc, imageIndex: i });
    });
    // Search featured items
    (sale.featured_items || []).forEach((item, i) => {
      if (item.name?.toLowerCase().includes(term)) results.push({ type: `Featured Item ${i + 1}`, text: item.name });
      if (item.description?.toLowerCase().includes(term)) results.push({ type: `Featured Item ${i + 1} Desc`, text: item.description });
    });
    setSearchResults(results);
  };

  const handleSearchResultClick = (result) => {
    if (result.imageIndex !== undefined) {
      setSelectedImage(result.imageIndex);
      setSearchOpen(false);
      setModalOpen(true);
    } else {
      setSearchOpen(false);
    }
  };

  const toggleImageSave = async (index) => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const image = sale.images[index];
    const imageUrl = typeof image === 'string' ? image : image?.url;
    const imageName = typeof image === 'object' ? (image.name || '') : '';
    const imageDesc = typeof image === 'object' ? (image.description || '') : '';

    setSavedImages(prev => {
      const isCurrentlySaved = prev.includes(index);
      
      if (isCurrentlySaved) {
        // Remove from saved
        const updated = prev.filter(i => i !== index);
        localStorage.setItem(`savedImages_${sale.id}`, JSON.stringify(updated));
        return updated;
      } else {
        // Add to saved in localStorage
        const updated = [...prev, index];
        localStorage.setItem(`savedImages_${sale.id}`, JSON.stringify(updated));
        
        // Create WantedItem entity
        createWantedItemFromImage(imageUrl, imageName, imageDesc, index);
        return updated;
      }
    });
  };

  const createWantedItemFromImage = async (imageUrl, name, description, imageIndex) => {
    try {
      // Extract category from sale categories or use generic
      const primaryCategory = sale.categories?.[0] || 'other';
      
      // Create a wanted item based on the saved image
      await base44.entities.WantedItem.create({
        buyer_id: currentUser.id,
        buyer_name: currentUser.full_name || currentUser.email,
        title: name || `Item from ${sale.title}`,
        description: description || `Interested in this item from estate sale: ${sale.title}`,
        category: primaryCategory,
        image_url: imageUrl,
        status: 'active',
        public_visibility: false,
        distance: 50,
        shipping_ok: true,
        allow_dealer_contact: true,
      });
      
      alert('✓ Item saved to your wanted list! We\'ll notify you when similar items are found.');
    } catch (error) {
      console.error('Error creating wanted item:', error);
      alert('Could not save to wanted list. Please try again.');
    }
  };

  // --- Dynamic SEO (safe — hooks must not be conditional) ---
  const saleCity = sale?.property_address?.city;
  const saleState = sale?.property_address?.state;
  const saleLocation = saleCity && saleState ? `${saleCity}, ${saleState}` : '';
  const firstImage = sale?.images?.[0];
  const firstImageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;
  const saleCategories = sale?.categories?.join(', ');
  const saleDates = sale?.sale_dates?.map(d => format(new Date(d.date + 'T00:00:00'), 'MMM d, yyyy'))?.join(', ') || '';

  const seoTitle = sale
    ? `${sale.title}${saleLocation ? ` — Estate Sale in ${saleLocation}` : ''} | EstateSalen.com`
    : 'Estate Sale | EstateSalen.com';

  const seoDesc = sale
    ? `${saleCategories ? `${saleCategories} available. ` : ''}Estate sale${saleLocation ? ` in ${saleLocation}` : ''}${saleDates ? `. Dates: ${saleDates}` : ''}. Find treasures and unique items on EstateSalen.com.`
    : 'Find estate sale details, dates, photos, and items on EstateSalen.com.';

  // Build per-image ImageObject structured data for Google Images indexing
  const imageObjects = (sale?.images || [])
    .filter(img => {
      const url = typeof img === 'string' ? img : img?.url;
      return !!url;
    })
    .map(img => {
      const url = typeof img === 'string' ? img : img?.url;
      const name = typeof img === 'object' ? (img.name || '') : '';
      const desc = typeof img === 'object' ? (img.description || '') : '';
      return {
        '@type': 'ImageObject',
        contentUrl: url,
        url: url,
        name: name || `${sale.title}${saleLocation ? ` — ${saleLocation}` : ''} estate sale item`,
        description: desc || `Estate sale item from ${sale.title}${saleLocation ? ` in ${saleLocation}` : ''}. ${(sale.categories || []).slice(0, 3).join(', ')}.`,
        representativeOfPage: false,
      };
    });

  const sellerOrgName = operator?.company_name || sale?.operator_name || 'Estate Sale Company';
  const sellerOrgUrl = operator?.company_website || window.location.origin;

  // JSON-LD Event schema for sale pages — Google rich results
  const jsonLd = sale ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: sale.title,
    description: sale.description || seoDesc,
    image: imageObjects.length > 0 ? imageObjects : (firstImageUrl || undefined),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: saleLocation || 'Estate Sale Location',
      address: {
        '@type': 'PostalAddress',
        addressLocality: saleCity || '',
        addressRegion: saleState || '',
        postalCode: sale.property_address?.zip || '',
        addressCountry: 'US',
      },
    },
    startDate: sale.sale_dates?.[0]?.date || undefined,
    endDate: sale.sale_dates?.[sale.sale_dates.length - 1]?.date || undefined,
    organizer: {
      '@type': 'Organization',
      name: sellerOrgName,
      url: sellerOrgUrl,
    },
    performer: {
      '@type': 'Organization',
      name: sellerOrgName,
      url: sellerOrgUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: window.location.href,
      validFrom: sale.sale_dates?.[0]?.date || new Date().toISOString().split('T')[0],
    },
    keywords: sale.categories?.join(', ') || 'estate sale, antiques, furniture, collectibles',
  } : null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useSEO({ title: seoTitle, description: seoDesc, image: firstImageUrl, jsonLd });

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
                  <Button variant="outline" size="icon" onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(true); }}>
                    <Search className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="w-5 h-5" />
                  </Button>
                  {currentUser && (
                    <>
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
                        src={getImageSrc(sale.images[selectedImage], 'gallery')}
                        alt={typeof sale.images[selectedImage] === 'object' && sale.images[selectedImage]?.name ? `${sale.images[selectedImage].name} — ${sale.title}${saleLocation ? ` estate sale in ${saleLocation}` : ''}` : `${sale.title}${saleLocation ? ` estate sale in ${saleLocation}` : ''}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width="800"
                        height="600"
                        style={{ transform: `rotate(${typeof sale.images[selectedImage]?.rotation === 'number' ? sale.images[selectedImage].rotation : 0}deg)` }}
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
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {sale.images.slice(0, visibleThumbnails).map((image, index) => {
                          const imageUrl = typeof image === 'string' ? image : image?.url;
                          const thumbnailUrl = getImageSrc(image, 'thumbnail', { imageThumbnails: sale.image_thumbnails, index });
                          
                          return (
                            <div key={index} className="relative">
                              <button
                                onClick={() => {
                                  setSelectedImage(index);
                                  setModalOpen(true);
                                }}
                                className={`w-full aspect-square rounded-lg overflow-hidden border-2 hover:border-orange-400 transition-colors cursor-pointer ${
                                  selectedImage === index ? 'border-orange-600' : 'border-slate-200'
                                }`}
                              >
                                <img
                                  src={thumbnailUrl}
                                  alt={typeof image === 'object' && image?.name ? `${image.name} — ${sale.title}${saleLocation ? ` in ${saleLocation}` : ''}` : `${sale.title}${saleLocation ? ` estate sale in ${saleLocation}` : ''} — photo ${index + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                  loading="lazy"
                                  width="300"
                                  height="300"
                                  style={{ transform: `rotate(${typeof image?.rotation === 'number' ? image.rotation : 0}deg)` }}
                                />
                              </button>
                              {currentUser && savedImages.includes(index) && (
                                <div className="absolute top-1 right-1">
                                  <Heart className="w-4 h-4 fill-red-600 text-red-600" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {sale.images.length > visibleThumbnails && (
                        <div className="mt-4 text-center">
                          <Button
                            onClick={() => setVisibleThumbnails(prev => prev + 20)}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                          >
                            Load More ({sale.images.length - visibleThumbnails} remaining)
                          </Button>
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>

              {/* Image Modal */}
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
                  <div className="relative flex items-center justify-center bg-black h-[70vh] sm:min-h-[85vh] group">
                    <img
                      src={getImageSrc(sale.images[selectedImage], 'large')}
                      alt={typeof sale.images[selectedImage] === 'object' && sale.images[selectedImage]?.name ? `${sale.images[selectedImage].name} — ${sale.title}${saleLocation ? ` estate sale in ${saleLocation}` : ''}` : `${sale.title}${saleLocation ? ` estate sale in ${saleLocation}` : ''}`}
                      className="max-h-[70vh] sm:max-h-[85vh] max-w-full object-contain"
                      width="1920"
                      height="1080"
                      style={{ transform: `rotate(${typeof sale.images[selectedImage]?.rotation === 'number' ? sale.images[selectedImage].rotation : 0}deg)` }}
                    />
                    {currentUser && (
                      <button
                        onClick={() => toggleImageSave(selectedImage)}
                        className="absolute top-4 left-4 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                      >
                        <Heart 
                          className={`w-6 h-6 ${savedImages.includes(selectedImage) ? 'fill-red-600 text-red-600' : 'text-slate-600'}`} 
                        />
                      </button>
                    )}
                    {/* Toggle Description Button */}
                    {typeof sale.images[selectedImage] === 'object' && (sale.images[selectedImage]?.name || sale.images[selectedImage]?.description) && (
                      <button
                        onClick={() => setShowImageDescription(!showImageDescription)}
                        className="absolute top-4 left-16 bg-white/90 rounded-full p-2 shadow-lg hover:bg-white transition-colors z-10"
                        title={showImageDescription ? 'Hide description' : 'Show description'}
                      >
                        {showImageDescription ? (
                          <EyeOff className="w-5 h-5 text-slate-700" />
                        ) : (
                          <Eye className="w-5 h-5 text-slate-700" />
                        )}
                      </button>
                    )}
                    {sale.images.length > 1 && (
                       <>
                         <button
                           onClick={() => setSelectedImage(prev => prev === 0 ? sale.images.length - 1 : prev - 1)}
                           className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                         >
                           <ChevronLeft className="w-6 h-6 text-slate-900" />
                         </button>
                         <button
                           onClick={() => setSelectedImage(prev => prev === sale.images.length - 1 ? 0 : prev + 1)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-3 shadow-lg hover:bg-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                         >
                           <ChevronRight className="w-6 h-6 text-slate-900" />
                         </button>
                       </>
                     )}

                    {/* Description Overlay */}
                    {showImageDescription && typeof sale.images[selectedImage] === 'object' && (sale.images[selectedImage]?.name || sale.images[selectedImage]?.description) && (
                      <div className="absolute bottom-16 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-2xl mx-auto">
                        {sale.images[selectedImage]?.name && (
                          <h4 className="text-white font-semibold text-xl mb-2">{sale.images[selectedImage].name}</h4>
                        )}
                        {sale.images[selectedImage]?.description && (
                          <p className="text-white/90 text-sm">{sale.images[selectedImage].description}</p>
                        )}
                      </div>
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

            {/* Map — only show when address is visible (24h before sale) */}
            {sale.location && sale.location.lat && sale.location.lng && isSaleAddressVisible(sale) && (
              <Card>
                <CardContent className="p-0">
                  <MapContainer
                    center={[sale.location.lat, sale.location.lng]}
                    zoom={15}
                    style={{ height: '300px', width: '100%' }}
                    className="rounded-lg"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
                    isSaleAddressVisible(sale) ? (
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
                    ) : (
                      <div className="text-sm text-slate-500 italic">
                        <p>Address will be revealed 24 hours before the sale starts</p>
                        <p className="mt-1">{sale.property_address.city}, {sale.property_address.state}</p>
                      </div>
                    )
                  )}
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Sale Dates & Times
                  </h3>
                  <div className="space-y-3">
                    {sale.sale_dates && sale.sale_dates.length > 0 ? sale.sale_dates.map((dateInfo, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <div className="font-semibold text-slate-900">
                          {format(new Date(dateInfo.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                          <Clock className="w-4 h-4" />
                          {convertTo12Hour(dateInfo.start_time)} - {convertTo12Hour(dateInfo.end_time)}
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 italic">Dates and times coming soon</p>
                    )}
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

                {/* Estimated Value - Only visible to Estate Sale Company Owner */}
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
                     {savedImages.map((imageIndex) => {
                       const imageUrl = typeof sale.images[imageIndex] === 'string' ? sale.images[imageIndex] : sale.images[imageIndex]?.url;
                       const thumbnailUrl = getImageSrc(sale.images[imageIndex], 'thumbnail', { imageThumbnails: sale.image_thumbnails, index: imageIndex });

                       return (
                         <button
                           key={imageIndex}
                           onClick={() => {
                             setSelectedImage(imageIndex);
                             setModalOpen(true);
                           }}
                           className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-red-600 transition-colors group"
                         >
                           <img
                             src={thumbnailUrl}
                             alt={`Saved photo ${imageIndex + 1}`}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                             width="300"
                             height="300"
                             loading="lazy"
                             style={{ transform: `rotate(${typeof sale.images[imageIndex]?.rotation === 'number' ? sale.images[imageIndex].rotation : 0}deg)` }}
                           />
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                         </button>
                       );
                     })}
                   </div>
                   <div className="space-y-2 mt-4">
                     <Button
                       onClick={handleMessageOperator}
                       className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                     >
                       <MessageSquare className="w-4 h-4" />
                       Message Seller About These Photos
                     </Button>
                     <Button
                       variant="outline"
                       className="w-full gap-2"
                       onClick={() => window.location.href = createPageUrl('MyProfile')}
                     >
                       <Heart className="w-4 h-4" />
                       View My Wanted Items
                     </Button>
                   </div>
                 </CardContent>
               </Card>
             )}

            {/* Estate Sale Company Owner Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {(operator?.company_logo_url || operator?.company_logo || operator?.logo_dark || operator?.logo_light) ? (
                    <img
                      src={operator.company_logo_url || operator.company_logo || operator.logo_dark || operator.logo_light}
                      alt={operator?.company_name || sale.operator_name || ''}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {operator?.company_name || sale.operator_name || 'Estate Sale Company Owner'}
                    </h3>
                    {operator?.company_description && (
                      <p className="text-sm text-slate-600 mt-1">{operator.company_description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {(operator?.business_phone || operator?.phone) && (
                    <a
                      href={`tel:${operator.business_phone || operator.phone}`}
                      className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700"
                    >
                      <Phone className="w-4 h-4" />
                      {formatPhone(operator.business_phone || operator.phone)}
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

                <div className="space-y-2 mt-4">
                  <SignTheListButton
                    saleId={sale.id}
                    saleTitle={sale.title}
                    saleDates={sale.sale_dates}
                    user={currentUser}
                    onSuccess={() => {}}
                    earlySignInEnabled={sale.early_sign_in_enabled !== false}
                  />

                  {sale.total_items > 0 && (
                    <Button 
                      onClick={() => window.location.href = createPageUrl('SaleLanding') + '?saleId=' + sale.id}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      View Inventory Items
                    </Button>
                  )}

                  {sale.operator_id && (
                    <Button
                      onClick={handleFollowCompany}
                      disabled={followingCompany}
                      variant="outline"
                      className={`w-full gap-2 ${isFollowingCompany ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-slate-300'}`}
                    >
                      <Building2 className="w-4 h-4" />
                      {followingCompany ? '...' : isFollowingCompany ? '✓ Following Company' : 'Follow This Company'}
                    </Button>
                  )}

                  {currentUser && (
                    <Button 
                      onClick={handleMessageOperator}
                      className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message Seller
                    </Button>
                  )}
                  {!currentUser && (
                    <Button 
                      onClick={() => base44.auth.redirectToLogin(window.location.href)}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      Sign In to Contact
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {currentUser && (
        <MessageModal
          open={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          recipient={contactBuyer || operator || { id: sale.operator_id, full_name: sale.operator_name || 'Estate Sale Company Owner' }}
          relatedEntity={{ type: 'EstateSale', id: sale.id, title: sale.title, name: wantedItemTitle ? `Inquiry: ${wantedItemTitle} — ${sale.title}` : `Re: ${sale.title}` }}
          savedImages={savedImages}
          allImages={sale.images}
        />
      )}

      {/* Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Search This Sale</h3>
            <input
              type="text"
              placeholder="Search titles, descriptions, categories..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-sm"
              autoFocus
            />
            {searchQuery.trim() && searchResults.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No results found for "{searchQuery}"</p>
            )}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchResultClick(r)}
                    className={`w-full text-left bg-slate-50 hover:bg-slate-100 rounded-lg p-3 transition-colors ${r.imageIndex !== undefined ? 'cursor-pointer' : ''}`}
                  >
                    <Badge variant="secondary" className="mb-1 text-xs">{r.type}</Badge>
                    <p className="text-sm text-slate-700">{r.text}</p>
                    {r.imageIndex !== undefined && (
                      <p className="text-xs text-orange-600 mt-1">Click to view photo →</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={window.location.href}
        title={sale.title}
      />

      <SharedFooter />
    </div>
  );
}