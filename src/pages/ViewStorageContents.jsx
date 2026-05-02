import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, MapPin, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ViewStorageContents() {
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('location_id');
  const [location, setLocation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, [locationId]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      if (locationId) {
        // Fetch the storage location
        const locations = await base44.entities.StorageLocation.filter({ id: locationId });
        if (locations.length > 0) {
          setLocation(locations[0]);

          // Fetch all items stored in this location
          const itemsData = await base44.entities.Item.filter({ 
            storage_location_id: locationId,
            seller_id: userData.id,
            status: 'available'
          });
          setItems(itemsData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  if (!location) {
    return (
      <div className="p-8 text-center">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">Storage location not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link to="/StorageManagement">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Storage Location</h1>
          <p className="text-slate-600 text-sm mt-1">Items stored in this location</p>
        </div>
      </div>

      {/* Location Info */}
      <Card className="bg-cyan-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-900">
            <MapPin className="w-5 h-5" />
            {location.space_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Full Location</p>
              <p className="text-sm font-medium text-cyan-900 mt-1">{location.location_path}</p>
            </div>
            {location.capacity_notes && (
              <div>
                <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide">Notes</p>
                <p className="text-sm text-cyan-900 mt-1">{location.capacity_notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Count */}
      <Card>
        <CardContent className="p-4">
          <p className="text-slate-600">Items stored here:</p>
          <p className="text-3xl font-bold text-orange-600">{items.length}</p>
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">No items stored in this location</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-32 bg-slate-100 overflow-hidden">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                  {item.title}
                </h3>
                <div className="space-y-2">
                  {item.category && (
                    <Badge variant="outline" className="text-xs">
                      {item.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-lg font-bold text-orange-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{item.price.toLocaleString()}</span>
                  </div>
                  {item.condition && (
                    <p className="text-xs text-slate-500">
                      Condition: {item.condition.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}