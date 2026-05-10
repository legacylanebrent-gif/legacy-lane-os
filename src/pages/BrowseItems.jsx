import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, ShoppingBag, Grid3x3, List, X } from 'lucide-react';
import MarketplaceItemCard from '@/components/marketplace/MarketplaceItemCard';
import { Skeleton } from '@/components/ui/skeleton';
import UniversalHeader from '@/components/layout/UniversalHeader';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'art', label: 'Art & Collectibles' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'decor', label: 'Home Decor' },
  { value: 'antiques', label: 'Antiques' },
  { value: 'other', label: 'Other' },
];

const LISTING_TYPES = [
  { value: 'all', label: 'All Listings' },
  { value: 'FOR_SALE', label: 'Fixed Price' },
  { value: 'AUCTION', label: 'Auctions' },
];

const AUCTION_TYPES = [
  { value: 'all', label: 'All Auction Types' },
  { value: 'SIMPLE', label: 'Real-Time Auction' },
  { value: 'AUTO_BID', label: 'Auto-Bid (Proxy)' },
  { value: 'SEALED_BID', label: 'Sealed Bid' },
];

const SHIPPING_OPTIONS = [
  { value: 'all', label: 'All Options' },
  { value: 'SHIPS_ONLY', label: 'Ships Only' },
  { value: 'LOCAL_PICKUP_ONLY', label: 'Local Pickup Only' },
  { value: 'BOTH', label: 'Ships & Pickup' },
];

export default function BrowseItems() {
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [listingType, setListingType] = useState('all');
  const [auctionType, setAuctionType] = useState('all');
  const [locationFilter, setLocationFilter] = useState('national');
  const [shippingOption, setShippingOption] = useState('all');
  const [userZip, setUserZip] = useState('');
  const [locationRadius, setLocationRadius] = useState(25);

  // Get user location on mount
  useEffect(() => {
    getUserLocation();
    loadMarketplaceItems();
    base44.auth.isAuthenticated().then(authed => {
      setIsAuthenticated(authed);
      if (authed) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  // Refilter when any filter changes
  useEffect(() => {
    filterItems();
  }, [
    marketplaceItems,
    searchQuery,
    selectedCategory,
    priceRange,
    listingType,
    auctionType,
    locationFilter,
    shippingOption,
    userZip,
    locationRadius,
    userLocation,
  ]);

  const getUserLocation = async () => {
    try {
      const user = await base44.auth.me();
      if (user) {
        setUserLocation(user);
        if (user.location_zip) setUserZip(user.location_zip);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const loadMarketplaceItems = async () => {
    try {
      setLoading(true);
      const miList = await base44.entities.MarketplaceItem.filter({ status: 'ACTIVE' }, '-created_date', 500);
      if (!miList || miList.length === 0) { setMarketplaceItems([]); return; }

      // Fetch all linked Item records in one call
      const itemIds = [...new Set(miList.map(mi => mi.item_id).filter(Boolean))];
      const allItems = itemIds.length
        ? await base44.entities.Item.filter({ id: { $in: itemIds } })
        : [];
      const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));

      // Merge Item fields into each MarketplaceItem
      const enriched = miList.map(mi => {
        const linkedItem = itemMap[mi.item_id] || {};
        return {
          ...linkedItem,   // title, description, images, category, condition, etc.
          ...mi,           // MI fields win (price, listing_type, shipping_option, etc.)
          image_url: (linkedItem.images || [])[0] || null,
        };
      });

      setMarketplaceItems(enriched);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filterItems = () => {
    let filtered = marketplaceItems;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query),
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(item => {
      const price = item.listing_type === 'FOR_SALE' ? item.price : item.reserve_price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Listing type filter
    if (listingType !== 'all') {
      filtered = filtered.filter(item => item.listing_type === listingType);
    }

    // Auction type filter (only applies to auctions)
    if (auctionType !== 'all' && listingType !== 'FOR_SALE') {
      filtered = filtered.filter(item => item.auction_type === auctionType);
    }

    // Shipping option filter
    if (shippingOption !== 'all') {
      filtered = filtered.filter(item => {
        if (shippingOption === 'SHIPS_ONLY') return item.shipping_option === 'SHIPS_ONLY';
        if (shippingOption === 'LOCAL_PICKUP_ONLY') return item.shipping_option === 'LOCAL_PICKUP_ONLY';
        if (shippingOption === 'BOTH') return item.shipping_option === 'BOTH';
        return true;
      });
    }

    // Location filter
    if (locationFilter === 'local' && userZip) {
      // TODO: Implement ZIP code distance calculation
      // For now, filter by exact ZIP match for local pickup items
      filtered = filtered.filter(
        item =>
          (item.shipping_option === 'LOCAL_PICKUP_ONLY' || item.shipping_option === 'BOTH') &&
          item.pickup_location_zip === userZip,
      );
    } else if (locationFilter === 'national') {
      // Show items that ship
      filtered = filtered.filter(
        item => item.shipping_option === 'SHIPS_ONLY' || item.shipping_option === 'BOTH',
      );
    }
    // 'all' shows everything

    setFilteredItems(filtered);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <UniversalHeader user={currentUser} isAuthenticated={isAuthenticated} />

      {/* Page Title + Search Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-orange-500" />
              <div>
                <h1 className="text-2xl font-serif font-bold text-slate-900">Marketplace</h1>
                <p className="text-sm text-slate-500">{filteredItems.length} items available</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('grid')}>
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('list')}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search items, sellers, or keywords..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24 space-y-6">
              <h3 className="font-bold text-lg text-navy-900">Filters</h3>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Category</label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Price Range</label>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={10000}
                    step={50}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              {/* Listing Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Listing Type</label>
                <select
                  value={listingType}
                  onChange={e => setListingType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {LISTING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auction Type (if auctions selected) */}
              {listingType === 'AUCTION' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Auction Type</label>
                  <select
                    value={auctionType}
                    onChange={e => setAuctionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {AUCTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Location</label>
                <select
                  value={locationFilter}
                  onChange={e => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="all">All Items</option>
                  <option value="national">National (Ships)</option>
                  <option value="local">Local Pickup Only</option>
                </select>
              </div>

              {/* Local ZIP */}
              {locationFilter === 'local' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Your ZIP Code</label>
                  <Input
                    type="text"
                    placeholder="e.g., 10001"
                    value={userZip}
                    onChange={e => setUserZip(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Shipping Option */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Shipping Option</label>
                <select
                  value={shippingOption}
                  onChange={e => setShippingOption(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {SHIPPING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setPriceRange([0, 10000]);
                  setListingType('all');
                  setAuctionType('all');
                  setLocationFilter('national');
                  setShippingOption('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No items found</h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredItems.map(item => (
                  <Link key={item.id} to={`/MarketplaceItemDetail?id=${item.id}`}>
                    <MarketplaceItemCard item={item} viewMode={viewMode} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20 px-4 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src="https://media.base44.com/images/public/69471382fc72e5b50c72fcc7/9e49bee96_logo_pic.png" alt="logo" className="h-14 w-14 object-contain" />
                <div>
                  <h3 className="text-2xl font-serif font-bold">EstateSalen.com</h3>
                  <p className="text-sm text-orange-400">Estate Sale Finder</p>
                </div>
              </div>
              <p className="text-slate-400 text-lg mb-6">
                Discover amazing estate sales and find treasures near you. Connect with trusted estate sale companies nationwide.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('SearchByState')} className="text-white hover:text-orange-400 transition-colors">Browse by State</Link></li>
                <li><Link to={createPageUrl('BrowseOperators')} className="text-white hover:text-orange-400 transition-colors">Browse Companies</Link></li>
                <li><Link to={createPageUrl('Home')} className="text-white hover:text-orange-400 transition-colors">Find Sales</Link></li>
                <li><Link to={createPageUrl('BrowseItems')} className="text-white hover:text-orange-400 transition-colors">Marketplace</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">For Businesses</h4>
              <ul className="space-y-2">
                <li><Link to={createPageUrl('OperatorPackages')} className="text-white hover:text-orange-400 transition-colors">List Your Company</Link></li>
                <li><Link to={createPageUrl('AgentSignup')} className="text-white hover:text-orange-400 transition-colors">Real Estate Agents</Link></li>
                <li><Link to={createPageUrl('VendorSignup')} className="text-white hover:text-orange-400 transition-colors">Vendors</Link></li>
                <li><Link to={createPageUrl('StartYourCompany')} className="text-white hover:text-orange-400 transition-colors font-semibold">Start Your Own Estate Sale Company</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-500">© {new Date().getFullYear()} EstateSalen.com. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}