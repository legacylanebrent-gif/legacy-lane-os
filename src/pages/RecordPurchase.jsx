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
import { Receipt, Calendar, DollarSign, Search, Info, MapPin } from 'lucide-react';

export default function RecordPurchase() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkinSales, setCheckinSales] = useState([]); // sales from check-ins last 14 days
  const [activeSales, setActiveSales] = useState([]);   // active/recent sales found via search
  const [searchingActive, setSearchingActive] = useState(false);
  const [activeSearchDone, setActiveSearchDone] = useState(false);
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
    const init = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      await loadCheckinSales(userData);

      // Pre-fill sale location from URL param
      const params = new URLSearchParams(window.location.search);
      const prefillLocation = params.get('saleLocation');
      if (prefillLocation) {
        setShowCustomLocation(true);
        setFormData(prev => ({ ...prev, custom_location: prefillLocation }));
      }
    };
    init();
  }, []);

  const loadCheckinSales = async (userData) => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);

      // Get user's check-ins from the past 14 days
      const checkIns = await base44.entities.CheckIn.filter({ created_by: userData.email });
      const recentCheckIns = checkIns.filter(c => new Date(c.created_date) >= cutoff);

      if (recentCheckIns.length === 0) return;

      // Get unique sale IDs from check-ins
      const saleIds = [...new Set(recentCheckIns.map(c => c.location_id).filter(Boolean))];

      // Fetch those sales
      const allSales = await base44.entities.EstateSale.list('-created_date', 200);
      const matched = allSales.filter(s => saleIds.includes(s.id));

      // Also include sales matched by name from check-ins (location_name)
      const locationNames = [...new Set(recentCheckIns.map(c => c.location_name).filter(Boolean))];
      const byName = allSales.filter(s =>
        !matched.find(m => m.id === s.id) &&
        locationNames.some(n => s.title?.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(s.title?.toLowerCase()))
      );

      setCheckinSales([...matched, ...byName]);
    } catch (error) {
      console.error('Error loading check-in sales:', error);
    }
  };

  const searchActiveSales = async () => {
    setSearchingActive(true);
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const allSales = await base44.entities.EstateSale.list('-created_date', 200);
      const eligible = allSales.filter(s => {
        if (s.status === 'active' || s.status === 'upcoming') return true;
        // Archived/completed but had a sale date within last 3 days
        if ((s.status === 'completed' || s.status === 'archived') && s.sale_dates?.length > 0) {
          const lastDate = s.sale_dates[s.sale_dates.length - 1]?.date;
          if (lastDate && new Date(lastDate + 'T23:59:59') >= threeDaysAgo) return true;
        }
        return false;
      });

      // Exclude ones already in checkinSales
      const existing = new Set(checkinSales.map(s => s.id));
      setActiveSales(eligible.filter(s => !existing.has(s.id)));
      setActiveSearchDone(true);
    } catch (error) {
      console.error('Error searching active sales:', error);
    } finally {
      setSearchingActive(false);
    }
  };

  const allLocationOptions = [
    ...checkinSales.map(s => ({ id: s.id, label: s.title, badge: 'Checked In' })),
    ...activeSales.map(s => ({ id: s.id, label: s.title, badge: s.status === 'active' ? 'Active' : s.status === 'upcoming' ? 'Upcoming' : 'Recent' })),
  ];

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
      const purchaseMonth = formData.purchase_date.substring(0, 7); // YYYY-MM format
      await base44.entities.UserReward.create({
        user_id: user.id,
        action_id: 'purchase',
        action_name: 'Purchase at Estate Sale',
        points_earned: 10,
        month: purchaseMonth,
        reference_id: finalLocation,
        notes: `Purchase: ${formData.item_name}`
      });

      alert('Purchase recorded successfully! +10 points earned');
      navigate(createPageUrl('MyPurchases'));
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
            {/* Info notice */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                You can only record a purchase for a sale you've <strong>checked in at</strong>, or one that is <strong>currently active</strong> or <strong>ended within the past 3 days</strong>.
              </p>
            </div>
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
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="sale_location">Sale Location *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-7"
                    onClick={searchActiveSales}
                    disabled={searchingActive}
                  >
                    <Search className="w-3 h-3" />
                    {searchingActive ? 'Searching...' : 'Search Active & Recent Sales'}
                  </Button>
                </div>

                {checkinSales.length === 0 && !activeSearchDone && (
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    No check-ins found in the past 14 days. Use the search button to find active or recent sales.
                  </p>
                )}

                <Select onValueChange={handleLocationChange} value={showCustomLocation ? 'other' : formData.sale_location}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sale location" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocationOptions.length === 0 && (
                      <SelectItem value="__none" disabled>No sales found — use search above or enter custom</SelectItem>
                    )}
                    {checkinSales.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Recent Check-ins (14 days)</div>
                        {checkinSales.map(sale => (
                          <SelectItem key={sale.id} value={sale.title}>
                            ✅ {sale.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {activeSales.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">Active & Recent Sales</div>
                        {activeSales.map(sale => (
                          <SelectItem key={sale.id} value={sale.title}>
                            📍 {sale.title}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    <SelectItem value="other">✏️ Other (Enter Custom Location)</SelectItem>
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