import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Calendar, DollarSign, Eye, Bookmark } from 'lucide-react';

export default function AdminEstateSales() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchQuery, statusFilter, sales]);

  const loadSales = async () => {
    try {
      const data = await base44.entities.EstateSale.list();
      setSales(data);
      setFilteredSales(data);
    } catch (error) {
      console.error('Error loading estate sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    if (searchQuery) {
      filtered = filtered.filter(sale =>
        sale.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.property_address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.operator_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const getStatusBadge = (status) => {
    const configs = {
      upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
      active: { label: 'Active', className: 'bg-green-100 text-green-700' },
      completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
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
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Estate Sales Management</h1>
        <p className="text-slate-600">{sales.length} total estate sales</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by title, city, or operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredSales.map(sale => (
          <Card key={sale.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{sale.title}</h3>
                    {getStatusBadge(sale.status)}
                  </div>
                  {sale.premium_listing && (
                    <Badge className="bg-orange-600 text-white">Premium</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    {sale.property_address?.formatted_address || 
                     `${sale.property_address?.city}, ${sale.property_address?.state}`}
                  </div>
                  
                  {sale.operator_name && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Operator:</span> {sale.operator_name}
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