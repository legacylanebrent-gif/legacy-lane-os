import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Eye, Bookmark, Navigation, DollarSign, Package } from 'lucide-react';
import { format } from 'date-fns';
import { isSaleAddressVisible } from '@/utils/saleAddressUtils';
import { getSaleDisplayStatus } from '@/components/estate/getSaleDisplayStatus';

export default function EstateSaleCard({ estate, onClick, expanded = false }) {
  const [, setRefresh] = useState(0);

  // Force re-render every minute to update status based on current time
  useEffect(() => {
    const interval = setInterval(() => setRefresh(prev => prev + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const primaryImage = typeof estate.images?.[0] === 'string' 
    ? estate.images[0] 
    : estate.images?.[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800';
  const nextSaleDate = estate.sale_dates?.[0];

  return (
    <Card 
      className={`overflow-hidden transition-all hover:shadow-xl cursor-pointer ${
        expanded ? '' : 'hover:-translate-y-1'
      }`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={primaryImage}
          alt={estate.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          {(() => { const ds = getSaleDisplayStatus(estate); return <Badge className={getStatusColor(ds)}>{ds.charAt(0).toUpperCase() + ds.slice(1)}</Badge>; })()}
        </div>
        {estate.premium_listing && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gold-600 text-white">Featured</Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-serif font-bold text-navy-900 leading-tight">
            {estate.title}
          </h3>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Location */}
        <div className="flex items-start gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-gold-600 mt-0.5 shrink-0" />
          {isSaleAddressVisible(estate) ? (
            <span>
              {estate.property_address?.street && `${estate.property_address.street}, `}
              {estate.property_address?.city}, {estate.property_address?.state} {estate.property_address?.zip}
            </span>
          ) : (
            <span className="italic text-slate-400 text-xs">Address revealed 24 hrs before sale · {estate.property_address?.city}, {estate.property_address?.state}</span>
          )}
        </div>

        {/* Dates */}
        {estate.sale_dates && estate.sale_dates.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {estate.sale_dates.map((d, idx) => (
                <div key={idx}>
                  {format(new Date(d.date + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                  {d.start_time && ` • ${d.start_time}${d.end_time ? ` – ${d.end_time}` : ''}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distance (if available) */}
        {estate.distance && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Navigation className="w-4 h-4 text-gold-600 shrink-0" />
            <span>{(estate.distance / 1609.34).toFixed(1)} miles away</span>
          </div>
        )}

        {/* Operator */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Package className="w-4 h-4 text-gold-600 shrink-0" />
          <span>by {estate.operator_name || 'Legacy Lane'}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{estate.views || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Bookmark className="w-4 h-4" />
            <span>{estate.saves || 0}</span>
          </div>
          {estate.total_items > 0 && (
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              <span>{estate.total_items} items</span>
            </div>
          )}
        </div>

        {expanded && estate.description && (
          <div className="pt-3 border-t">
            <p className="text-sm text-slate-600 leading-relaxed">
              {estate.description}
            </p>
          </div>
        )}

        {expanded && estate.categories?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {estate.categories.map((cat, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {expanded && (
          <div className="pt-3 space-y-2">
            <Button className="w-full bg-gold-600 hover:bg-gold-700">
              View Details
            </Button>
            <Button variant="outline" className="w-full">
              Get Directions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}