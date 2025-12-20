import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Package, Truck } from 'lucide-react';

export default function ItemCard({ item, viewMode = 'grid' }) {
  const primaryImage = item.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <img
              src={primaryImage}
              alt={item.title}
              className="w-32 h-32 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-navy-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                {item.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                <span className="capitalize">{item.category?.replace(/_/g, ' ')}</span>
                {item.condition && <span>• {item.condition}</span>}
                {item.location?.city && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location.city}, {item.location.state}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-navy-900">
                  ${item.price.toLocaleString()}
                </p>
                <div className="flex gap-2">
                  {item.fulfillment_options?.includes('shipping') && (
                    <Badge variant="outline" className="text-xs">
                      <Truck className="w-3 h-3 mr-1" />
                      Ships
                    </Badge>
                  )}
                  {item.fulfillment_options?.includes('pickup') && (
                    <Badge variant="outline" className="text-xs">
                      <Package className="w-3 h-3 mr-1" />
                      Pickup
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all">
      <div className="relative h-56 overflow-hidden">
        <img
          src={primaryImage}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        {item.featured && (
          <Badge className="absolute top-3 left-3 bg-gold-600">Featured</Badge>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-navy-900 line-clamp-2 mb-2 min-h-[3rem]">
          {item.title}
        </h3>

        <div className="flex items-center justify-between mb-3">
          <p className="text-2xl font-bold text-navy-900">
            ${item.price.toLocaleString()}
          </p>
          {item.rating && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <span className="font-medium">{item.rating}</span>
              <span className="text-slate-500">({item.total_reviews})</span>
            </div>
          )}
        </div>

        <div className="text-sm text-slate-600 mb-3">
          by {item.seller_name}
        </div>

        {item.location?.city && (
          <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{item.location.city}, {item.location.state}</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {item.fulfillment_options?.includes('shipping') && (
            <Badge variant="outline" className="text-xs">
              <Truck className="w-3 h-3 mr-1" />
              Shipping
            </Badge>
          )}
          {item.fulfillment_options?.includes('pickup') && (
            <Badge variant="outline" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Pickup
            </Badge>
          )}
          {item.condition && (
            <Badge variant="outline" className="text-xs capitalize">
              {item.condition}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}