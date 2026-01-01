import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Receipt, Calendar, DollarSign } from 'lucide-react';

export default function RecordPurchase() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nearbySales, setNearbySales] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);
  const [formData, setFormData] = useState({
    item_name: '',
    purchase_amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    sale_location: '',
    custom_location: '',
    notes: ''
  });

  useEffect(() => {
    loadUser();
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbySales();
    }
  }, [userLocation]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadNearbySales = async () => {
    try {
      const allSales = await base44.entities.EstateSale.list('-created_date', 100);
      const activeSales = allSales.filter(s => s.status === 'upcoming' || s.status === 'active');
      
      const salesWithDistance = activeSales
        .filter(sale => sale.location && sale.location.lat && sale.location.lng)
        .map(sale => ({
          ...sale,
          distance: calculateDistance(
            userLocation.lat,
            userLocation.lng,
            sale.location.lat,
            sale.location.lng
          )
        }))
        .filter(sale => sale.distance < 25)
        .sort((a, b) => a.distance - b.distance);
      
      setNearbySales(salesWithDistance);
    } catch (error) {
      console.error('Error loading nearby sales:', error);
    }
  };

  const handleLocationChange = (value) => {
    if (value === 'other') {
      setShowCustomLocation(true);
      setFormData({ ...formData, sale_location: '', custom_location: '' });
    } else {
      setShowCustomLocation(false);
      setFormData({ ...formData, sale_location: value, custom_location: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.purchase_amount) {
      alert('Please fill in item name and amount');
      return;
    }

    if (!formData.sale_location && !formData.custom_location) {
      alert('Please select or enter a sale location');
      return;
    }

    setLoading(true);
    try {
      const finalLocation = formData.custom_location || formData.sale_location;
      const amount = parseFloat(formData.purchase_amount);
      
      // Record the purchase
      await base44.entities.Transaction.create({
        sale_id: 'user_purchase',
        item_name: formData.item_name,
        quantity: 1,
        price: amount,
        total: amount,
        payment_method: 'cash',
        notes: `${formData.notes ? formData.notes + ' | ' : ''}Location: ${finalLocation}`,
        transaction_date: new Date(formData.purchase_date).toISOString()
      });

      // Award points for purchase
      await base44.entities.UserReward.create({
        user_id: user.id,
        action_id: 'purchase',
        action_name: 'Purchase at Estate Sale',
        points_earned: 10,
        reference_id: finalLocation,
        notes: `Purchase: ${formData.item_name}`
      });

      alert('Purchase recorded successfully! +10 points earned');
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error recording purchase:', error);
      setErrorDetails({
        message: error.message || 'Unknown error',
        stack: error.stack,
        data: error.response?.data,
        fullError: JSON.stringify(error, null, 2)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-2xl mx-auto">
        {errorDetails && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center justify-between">
                Error Details
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setErrorDetails(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  Close
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Message:</strong> {errorDetails.message}
                </div>
                {errorDetails.data && (
                  <div>
                    <strong>Response Data:</strong>
                    <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto">
                      {JSON.stringify(errorDetails.data, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <strong>Full Error:</strong>
                  <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-64">
                    {errorDetails.fullError}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Record Purchase</CardTitle>
                <p className="text-sm text-slate-600">Track your estate sale finds and earn points</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="item_name">Item or Bundle Items *</Label>
                <Input
                  id="item_name"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="e.g., Vintage Chair, Antique Lamp, or Bundle of Books"
                  required
                />
              </div>

              <div>
                <Label htmlFor="purchase_amount">Purchase Amount * ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="purchase_amount"
                    type="number"
                    step="0.01"
                    value={formData.purchase_amount}
                    onChange={(e) => setFormData({ ...formData, purchase_amount: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sale_location">Sale Location *</Label>
                <Select onValueChange={handleLocationChange} value={showCustomLocation ? 'other' : formData.sale_location}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sale location" />
                  </SelectTrigger>
                  <SelectContent>
                    {nearbySales.length === 0 && !userLocation && (
                      <SelectItem value="loading" disabled>Loading nearby sales...</SelectItem>
                    )}
                    {nearbySales.length === 0 && userLocation && (
                      <SelectItem value="none" disabled>No nearby sales found</SelectItem>
                    )}
                    {nearbySales.map(sale => (
                      <SelectItem key={sale.id} value={sale.title}>
                        {sale.title} ({sale.distance.toFixed(1)} mi)
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (Custom Location)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showCustomLocation && (
                <div>
                  <Label htmlFor="custom_location">Custom Sale Location *</Label>
                  <Input
                    id="custom_location"
                    value={formData.custom_location}
                    onChange={(e) => setFormData({ ...formData, custom_location: e.target.value })}
                    placeholder="Enter address or sale name"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional details about your purchase..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('Dashboard'))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? 'Recording...' : 'Record Purchase (+10 points)'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}