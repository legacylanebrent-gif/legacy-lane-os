import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Mail, Phone, Building2, MapPin, Plus, Globe, CheckCircle } from 'lucide-react';
import AddUserModal from '@/components/admin/AddUserModal';

export default function AdminVendorUsers() {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subcategories, setSubcategories] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [searchQuery, subcategoryFilter, vendors]);

  const loadData = async () => {
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const vendorUsers = allUsers.filter(user => 
        user.primary_account_type === 'vendor' || 
        user.account_types?.includes('vendor')
      );
      setVendors(vendorUsers);
      setFilteredVendors(vendorUsers);

      const subs = await base44.entities.AccountSubcategory.filter({ account_type: 'vendor' });
      setSubcategories(subs || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vendor =>
        vendor.full_name?.toLowerCase().includes(query) ||
        vendor.email?.toLowerCase().includes(query) ||
        vendor.company_name?.toLowerCase().includes(query) ||
        vendor.phone?.includes(query)
      );
    }

    if (subcategoryFilter !== 'all') {
      filtered = filtered.filter(vendor => 
        vendor.account_subcategory === subcategoryFilter
      );
    }

    setFilteredVendors(filtered);
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
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Vendor Users</h1>
          <p className="text-slate-600">
            {filteredVendors.length} of {vendors.length} vendors
          </p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor User
        </Button>
      </div>

      <AddUserModal 
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadData}
      />

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name, email, company, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-2 block">Vendor Type</Label>
            <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={sub.subcategory_name}>
                    {sub.subcategory_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredVendors.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No vendor users found</p>
              <p className="text-sm text-slate-400 mb-4">Try adjusting your search or add a new vendor</p>
            </CardContent>
          </Card>
        ) : (
          filteredVendors.map(vendor => {
            const initials = vendor.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'V';
            
            return (
              <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={vendor.company_logo_url || vendor.profile_image_url} />
                      <AvatarFallback className="bg-cyan-600 text-white text-xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {vendor.company_name || vendor.full_name}
                          </h3>
                          {vendor.account_subcategory && (
                            <Badge className="bg-cyan-100 text-cyan-700">
                              {vendor.account_subcategory}
                            </Badge>
                          )}
                          {vendor.insured && (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Insured
                            </Badge>
                          )}
                          {vendor.bonded && (
                            <Badge className="bg-blue-100 text-blue-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Bonded
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-600" />
                            {vendor.email}
                          </div>
                          {vendor.company_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-cyan-600" />
                              {vendor.company_phone}
                            </div>
                          )}
                          {vendor.company_website && (
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-cyan-600" />
                              <a 
                                href={vendor.company_website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-cyan-600 hover:underline"
                              >
                                Website
                              </a>
                            </div>
                          )}
                          {vendor.service_areas && vendor.service_areas.length > 0 && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-cyan-600 mt-0.5" />
                              <span className="text-xs">{vendor.service_areas.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {vendor.years_in_business && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Years in Business:</span> {vendor.years_in_business}
                        </div>
                      )}

                      {vendor.crew_size && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Crew Size:</span> {vendor.crew_size}
                        </div>
                      )}

                      {vendor.response_time_hours && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Response Time:</span> {vendor.response_time_hours} hours
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-slate-400 font-mono">
                          ID: {vendor.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}