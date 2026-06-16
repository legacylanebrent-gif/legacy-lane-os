import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Eye } from 'lucide-react';

export default function MarketplaceFeatureSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  const loadMarketplaceItems = async () => {
    try {
      const allItems = await base44.entities.Item.filter(
        { marketplace_display_status: 'active' },
        '-views',
        10
      );
      setItems(allItems || []);
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 px-4 bg-[#f8f9fa]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#1a202c] mb-2">Marketplace</h2>
            <p className="text-lg text-[#4a5568]">Loading featured listings...</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-200 rounded-xl aspect-square mb-2"></div>
                <div className="bg-slate-200 h-4 rounded w-3/4 mb-1"></div>
                <div className="bg-slate-200 h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const formatPrice = (price) => {
    if (price == null) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  const getCategoryColor = (category) => {
    const map = {
      furniture: 'bg-amber-600',
      art: 'bg-purple-600',
      jewelry: 'bg-pink-600',
      collectibles: 'bg-emerald-600',
      electronics: 'bg-blue-600',
      clothing_accessories: 'bg-indigo-600',
      books_media: 'bg-teal-600',
      kitchen_dining: 'bg-orange-600',
      home_decor: 'bg-cyan-600',
      sporting_goods: 'bg-green-600',
      toys_games: 'bg-red-600',
      tools_hardware: 'bg-slate-600',
      vehicles: 'bg-rose-600',
      clocks_watches: 'bg-yellow-600',
      coins_currency: 'bg-lime-600',
      musical_instruments: 'bg-violet-600',
      glassware_crystal: 'bg-sky-600',
      rugs_textiles: 'bg-fuchsia-600',
      lighting_lamps: 'bg-amber-500',
      office_business: 'bg-slate-500',
      antiques: 'bg-amber-700',
      china_porcelain: 'bg-blue-500',
      garden_outdoor: 'bg-green-500',
    };
    return map[category] || 'bg-slate-500';
  };

  return (
    <section className="py-16 px-4 bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-[32px] md:text-[36px] font-bold text-[#1a202c] mb-2">
            Marketplace
          </h2>
          <p className="text-lg text-[#4a5568]">
            Featured items from our community marketplace
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map(item => (
            <Link
              key={item.id}
              to={createPageUrl('MarketplaceItemDetail') + '?id=' + (item.marketplace_item_id || item.id)}
              className="block group"
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 border border-slate-200">
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      {formatPrice(item.price)}
                    </span>
                    {item.category && (
                      <Badge className={`${getCategoryColor(item.category)} text-white text-[10px] px-1.5 py-0`}>
                        {item.category.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                    <Eye className="w-3 h-3" />
                    <span>{item.views || 0} views</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* View All link */}
        <div className="text-center mt-8">
          <Link
            to={createPageUrl('BrowseItems')}
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold text-sm"
          >
            View All Marketplace Listings &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}