import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Heart, Clock, Gavel, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MarketplaceItemCard({ item, viewMode = 'grid' }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isWatched, setIsWatched] = useState(false);
  const [businessName, setBusinessName] = useState(null);
  const [saleTitle, setSaleTitle] = useState(null);

  useEffect(() => {
    // Fetch operator business name and sale title
    const loadDetails = async () => {
      try {
        if (item.operator_id) {
          const users = await base44.entities.User.filter({ id: item.operator_id });
          if (users.length > 0) {
            setBusinessName(users[0].company_name || users[0].full_name);
          }
        }
        if (item.estate_sale_id) {
          const sales = await base44.entities.EstateSale.filter({ id: item.estate_sale_id });
          if (sales.length > 0) {
            setSaleTitle(sales[0].title);
          }
        }
      } catch (error) {
        console.error('Error loading details:', error);
      }
    };
    loadDetails();
  }, [item.operator_id, item.estate_sale_id]);

  useEffect(() => {
    if (item.listing_type === 'AUCTION' && item.auction_end_date) {
      const updateTimer = () => {
        const now = new Date();
        const end = new Date(item.auction_end_date);
        const diff = end - now;

        if (diff <= 0) {
          setTimeLeft('Ended');
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);

          if (days > 0) {
            setTimeLeft(`${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`${minutes}m`);
          }
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }
  }, [item]);

  const displayPrice =
    item.listing_type === 'FOR_SALE'
      ? `$${item.price?.toLocaleString()}`
      : item.reserve_price
        ? `Reserve: $${item.reserve_price?.toLocaleString()}`
        : 'No reserve';

  const listingLabel =
    item.listing_type === 'FOR_SALE' ? 'Fixed Price' : `${item.auction_type} Auction`;

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4">
        <div className="w-32 h-32 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden">
          {item.image_url && <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />}
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 line-clamp-1">{item.title}</h3>
            <p className="text-sm text-slate-600 line-clamp-1 mt-1">{item.description}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary">{listingLabel}</Badge>
              {item.shipping_option === 'LOCAL_PICKUP_ONLY' && (
                <Badge className="bg-sage-100 text-sage-700">Local Pickup</Badge>
              )}
              {item.shipping_option === 'BOTH' && <Badge className="bg-blue-100 text-blue-700">Ships & Pickup</Badge>}
            </div>
            <span className="font-bold text-lg text-gold-600">{displayPrice}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Image Container */}
      <div className="relative w-full h-60 bg-slate-100 overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">No image</div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <Badge className="bg-gold-600">{listingLabel}</Badge>
          {item.listing_type === 'AUCTION' && <Badge className="bg-red-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeLeft}
          </Badge>}
        </div>

        {/* Shipping Badge */}
        {item.shipping_option === 'LOCAL_PICKUP_ONLY' && (
          <Badge className="absolute top-3 right-3 bg-sage-600 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Pickup Only
          </Badge>
        )}

        {/* Watch Button */}
        <button
          onClick={e => {
            e.preventDefault();
            setIsWatched(!isWatched);
          }}
          className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all"
        >
          <Heart className={`w-5 h-5 ${isWatched ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-gold-600 transition-colors">
          {item.title}
        </h3>

        <div className="space-y-1 mb-3">
          <p className="text-sm text-slate-600 line-clamp-1">{businessName || item.operator_name || 'Listed by Operator'}</p>
          {saleTitle && (
            <p className="text-xs text-slate-500 line-clamp-1">From: {saleTitle}</p>
          )}
        </div>

        {/* Price */}
        <div className="mb-3">
          <span className="text-2xl font-bold text-gold-600">{displayPrice}</span>
          {item.shipping_cost > 0 && item.shipping_option !== 'LOCAL_PICKUP_ONLY' && (
            <span className="text-xs text-slate-500 ml-2">+ ${item.shipping_cost} shipping</span>
          )}
          {(item.shipping_cost === 0 || !item.shipping_cost) && item.shipping_option !== 'LOCAL_PICKUP_ONLY' && (
            <span className="text-xs text-green-600 ml-2">Free shipping</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs text-slate-500 border-t pt-3">
          <span>{item.view_count || 0} views</span>
          <span>{item.watch_count || 0} watching</span>
        </div>
      </div>
    </div>
  );
}