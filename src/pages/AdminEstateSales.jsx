import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Calendar, DollarSign, Eye, Bookmark, X, SlidersHorizontal, Plus, MoreVertical, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CreateEstateSaleModal from '@/components/estate/CreateEstateSaleModal';
import TechnologyCostAnalysis from '@/components/admin/TechnologyCostAnalysis';
import ProfitAnalysis from '@/components/admin/ProfitAnalysis';
import { createPageUrl } from '@/utils';

export default function AdminEstateSales() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [premiumFilter, setPremiumFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [saleTechCosts, setSaleTechCosts] = useState({});
  const [operatorSubscriptions, setOperatorSubscriptions] = useState({});

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, statusFilter, stateFilter, cityFilter, operatorFilter, premiumFilter, dateRangeFilter, minValue, maxValue, sales]);

  const loadSales = async () => {
    try {
      const data = await base44.entities.EstateSale.list();
      setSales(data);
      setFilteredSales(data);
      
      // Fetch all active subscriptions at once
      try {
        const allSubs = await base44.asServiceRole.entities.Subscription.filter({
          status: 'active'
        });

        const subscriptionsMap = {};
        allSubs.forEach(sub => {
          const userId = sub.data?.user_id || sub.user_id;
          if (userId) {
            subscriptionsMap[userId] = sub;
          }
        });

        setOperatorSubscriptions(subscriptionsMap);
      } catch (error) {
        console.error('Error loading subscriptions:', error);
      }
    } catch (error) {
      console.error('Error loading estate sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.title?.toLowerCase().includes(query) ||
        sale.description?.toLowerCase().includes(query) ||
        sale.property_address?.street?.toLowerCase().includes(query) ||
        sale.property_address?.city?.toLowerCase().includes(query) ||
        sale.property_address?.state?.toLowerCase().includes(query) ||
        sale.property_address?.zip?.includes(query) ||
        sale.operator_name?.toLowerCase().includes(query) ||
        sale.categories?.some(cat => cat.toLowerCase().includes(query)) ||
        sale.id?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // State filter
    if (stateFilter !== 'all') {
      filtered = filtered.filter(sale => sale.property_address?.state === stateFilter);
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter(sale => sale.property_address?.city === cityFilter);
    }

    // Operator filter
    if (operatorFilter !== 'all') {
      filtered = filtered.filter(sale => sale.operator_id === operatorFilter);
    }

    // Premium filter
    if (premiumFilter === 'premium') {
      filtered = filtered.filter(sale => sale.premium_listing === true);
    } else if (premiumFilter === 'standard') {
      filtered = filtered.filter(sale => !sale.premium_listing);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(sale => {
        if (!sale.sale_dates || sale.sale_dates.length === 0) return false;
        const saleDate = new Date(sale.sale_dates[0].date);
        
        if (dateRangeFilter === 'today') {
          return saleDate.toDateString() === now.toDateString();
        } else if (dateRangeFilter === 'this_week') {
          const weekFromNow = new Date(now);
          weekFromNow.setDate(now.getDate() + 7);
          return saleDate >= now && saleDate <= weekFromNow;
        } else if (dateRangeFilter === 'this_month') {
          return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        } else if (dateRangeFilter === 'next_month') {
          const nextMonth = new Date(now);
          nextMonth.setMonth(now.getMonth() + 1);
          return saleDate.getMonth() === nextMonth.getMonth() && saleDate.getFullYear() === nextMonth.getFullYear();
        }
        return true;
      });
    }

    // Value range filter
    if (minValue) {
      const min = parseFloat(minValue);
      filtered = filtered.filter(sale => 
        (sale.estimated_value && sale.estimated_value >= min) || 
        (sale.actual_revenue && sale.actual_revenue >= min)
      );
    }
    if (maxValue) {
      const max = parseFloat(maxValue);
      filtered = filtered.filter(sale => 
        (sale.estimated_value && sale.estimated_value <= max) || 
        (sale.actual_revenue && sale.actual_revenue <= max)
      );
    }

    setFilteredSales(filtered);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setStateFilter('all');
    setCityFilter('all');
    setOperatorFilter('all');
    setPremiumFilter('all');
    setDateRangeFilter('all');
    setMinValue('');
    setMaxValue('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || stateFilter !== 'all' || 
    cityFilter !== 'all' || operatorFilter !== 'all' || premiumFilter !== 'all' || 
    dateRangeFilter !== 'all' || minValue || maxValue;

  // Get unique states, cities and operators for filters
  const uniqueStates = [...new Set(sales.map(s => s.property_address?.state).filter(Boolean))].sort();
  const uniqueCities = [...new Set(sales.map(s => s.property_address?.city).filter(Boolean))].sort();
  const uniqueOperators = [...new Set(sales.map(s => ({ id: s.operator_id, name: s.operator_name })).filter(o => o.id))];
  const uniqueOperatorsMap = uniqueOperators.reduce((acc, op) => {
    if (!acc[op.id]) acc[op.id] = op.name;
    return acc;
  }, {});

  const handleDelete = async (saleId) => {
    if (!confirm('Are you sure you want to delete this estate sale?')) return;
    
    try {
      await base44.asServiceRole.entities.EstateSale.delete(saleId);
      await loadSales();
    } catch (error) {
      console.error('Error deleting estate sale:', error);
      alert('Failed to delete estate sale');
    }
  };

  const handleCostsCalculated = (saleId, costs) => {
    setSaleTechCosts(prev => {
      if (prev[saleId]?.actual === costs.actual && prev[saleId]?.scenario === costs.scenario) {
        return prev;
      }
      return { ...prev, [saleId]: costs };
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      active: { label: 'Active', className: 'bg-green-100 text-green-700' },
      completed: { label: 'Completed', className: 'bg-purple-100 text-purple-700' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' }
    };
    const config = configs[status] || configs.upcoming;
    return <Badge className={config.className}>{config.label}</Badge>;
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Estate Sales Management</h1>
          <p className="text-slate-600">
            {filteredSales.length} of {sales.length} estate sales
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Estate Sale
        </Button>
      </div>

      <CreateEstateSaleModal
        open={showCreateModal || editingSale !== null}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSale(null);
        }}
        onSuccess={loadSales}
        sale={editingSale}
      />

      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingSale(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{viewingSale.title}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setViewingSale(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {getStatusBadge(viewingSale.status)}
            </CardHeader>
            <CardContent className="space-y-6">
              {viewingSale.images && viewingSale.images.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {viewingSale.images.slice(0, 6).map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-full h-32 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-slate-600">{viewingSale.description || 'No description'}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Address</h4>
                <p className="text-slate-600">{viewingSale.property_address?.formatted_address}</p>
              </div>

              {viewingSale.sale_dates && viewingSale.sale_dates.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Sale Dates</h4>
                  {viewingSale.sale_dates.map((date, idx) => (
                    <p key={idx} className="text-slate-600">
                      {new Date(date.date).toLocaleDateString()} • {date.start_time} - {date.end_time}
                    </p>
                  ))}
                </div>
              )}

              {viewingSale.categories && viewingSale.categories.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingSale.categories.map((cat, idx) => (
                      <Badge key={idx} variant="outline">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {viewingSale.estimated_value && (
                  <div>
                    <p className="text-sm text-slate-500">Estimated Value</p>
                    <p className="text-lg font-semibold">${viewingSale.estimated_value.toLocaleString()}</p>
                  </div>
                )}
                {viewingSale.commission_rate && (
                  <div>
                    <p className="text-sm text-slate-500">Commission Rate</p>
                    <p className="text-lg font-semibold">{viewingSale.commission_rate}%</p>
                  </div>
                )}
              </div>

              {viewingSale.special_notes && (
                <div>
                  <h4 className="font-semibold mb-2">Special Notes</h4>
                  <p className="text-slate-600">{viewingSale.special_notes}</p>
                </div>
              )}

              {viewingSale.parking_info && (
                <div>
                  <h4 className="font-semibold mb-2">Parking Info</h4>
                  <p className="text-slate-600">{viewingSale.parking_info}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-slate-600" />
              <CardTitle>Search & Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by title, description, address, operator, categories, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">State</Label>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">City</Label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Operator</Label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Operators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operators</SelectItem>
                  {Object.entries(uniqueOperatorsMap).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Listing Type</Label>
              <Tabs value={premiumFilter} onValueChange={setPremiumFilter}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="premium" className="text-xs">Premium</TabsTrigger>
                  <TabsTrigger value="standard" className="text-xs">Standard</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Sale Date</Label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="next_month">Next Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Min Value ($)</Label>
              <Input
                type="number"
                placeholder="0"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Max Value ($)</Label>
              <Input
                type="number"
                placeholder="1,000,000"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredSales.map(sale => (
          <Card key={sale.id} className="hover:shadow-lg transition-shadow overflow-hidden w-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{sale.title}</h3>
                    {getStatusBadge(sale.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    {sale.premium_listing && (
                      <Badge className="bg-orange-600 text-white">Premium</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(createPageUrl('EstateSaleDetail') + '?id=' + sale.id, '_blank')}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Sale Page
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setViewingSale(sale)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(sale.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    {sale.property_address?.formatted_address || 
                     `${sale.property_address?.city}, ${sale.property_address?.state}`}
                  </div>
                  
                  {sale.operator_name && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Operator:</span> {sale.operator_name}
                      </div>
                      {operatorSubscriptions[sale.operator_id] && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">Package:</span>
                          <Badge variant="outline" className="bg-blue-50">
                            {operatorSubscriptions[sale.operator_id].plan_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${operatorSubscriptions[sale.operator_id].price}/month
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {sale.sale_dates && sale.sale_dates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-600" />
                      {new Date(sale.sale_dates[0].date).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {sale.views || 0} views
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="w-4 h-4" />
                      {sale.saves || 0} saves
                    </div>
                  </div>
                </div>

                {(sale.estimated_value || sale.actual_revenue) && (
                  <div className="pt-4 border-t flex gap-4 text-sm">
                    {sale.estimated_value && (
                      <div>
                        <span className="text-slate-500">Est. Value:</span>
                        <span className="font-semibold text-slate-900 ml-2">
                          ${sale.estimated_value.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {sale.actual_revenue && (
                      <div>
                        <span className="text-slate-500">Revenue:</span>
                        <span className="font-semibold text-green-600 ml-2">
                          ${sale.actual_revenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <TechnologyCostAnalysis 
                  sale={sale} 
                  onCostsCalculated={(costs) => handleCostsCalculated(sale.id, costs)}
                />
                <ProfitAnalysis 
                  sale={sale} 
                  techCosts={saleTechCosts[sale.id] || { actual: 0, scenario: 0 }}
                  operatorSubscription={operatorSubscriptions[sale.operator_id]}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSales.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No estate sales found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}