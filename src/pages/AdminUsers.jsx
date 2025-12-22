import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserCircle, Mail, Phone, Building2, Calendar, Plus, X, SlidersHorizontal } from 'lucide-react';
import AddUserModal from '@/components/admin/AddUserModal';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [subcategories, setSubcategories] = useState([]);
  const [onboardingFilter, setOnboardingFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadUsers();
    loadSubcategories();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, selectedSubcategory, onboardingFilter, users]);

  useEffect(() => {
    setSelectedSubcategory('all');
  }, [selectedRole]);

  const loadUsers = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        console.error('Not authenticated');
        setLoading(false);
        return;
      }
      const data = await base44.asServiceRole.entities.User.list();
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async () => {
    try {
      const data = await base44.entities.AccountSubcategory.list();
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.company_name?.toLowerCase().includes(query) ||
        user.brokerage_name?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.id?.toLowerCase().includes(query)
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => 
        user.primary_account_type === selectedRole ||
        user.account_types?.includes(selectedRole)
      );
    }

    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(user => 
        user.account_subcategory === selectedSubcategory
      );
    }

    if (onboardingFilter === 'completed') {
      filtered = filtered.filter(user => user.onboarding_completed === true);
    } else if (onboardingFilter === 'pending') {
      filtered = filtered.filter(user => !user.onboarding_completed);
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedSubcategory('all');
    setOnboardingFilter('all');
  };

  const hasActiveFilters = searchQuery || selectedRole !== 'all' || selectedSubcategory !== 'all' || onboardingFilter !== 'all';

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700',
      platform_ops: 'bg-purple-100 text-purple-700',
      estate_sale_operator: 'bg-orange-100 text-orange-700',
      real_estate_agent: 'bg-blue-100 text-blue-700',
      investor: 'bg-green-100 text-green-700',
      vendor: 'bg-cyan-100 text-cyan-700',
      coach: 'bg-amber-100 text-amber-700',
      consumer: 'bg-pink-100 text-pink-700',
      executor: 'bg-indigo-100 text-indigo-700',
      home_seller: 'bg-teal-100 text-teal-700',
      buyer: 'bg-sky-100 text-sky-700',
      downsizer: 'bg-violet-100 text-violet-700',
      diy_seller: 'bg-lime-100 text-lime-700',
      consignor: 'bg-fuchsia-100 text-fuchsia-700'
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  const accountTypeOptions = [
    { value: 'all', label: 'All Account Types' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'platform_ops', label: 'Platform Ops' },
    { value: 'growth_team', label: 'Growth Team' },
    { value: 'partnerships', label: 'Partnerships' },
    { value: 'education_admin', label: 'Education Admin' },
    { value: 'finance_admin', label: 'Finance Admin' },
    { value: 'estate_sale_operator', label: 'Estate Sale Operator' },
    { value: 'real_estate_agent', label: 'Real Estate Agent' },
    { value: 'investor', label: 'Investor' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'coach', label: 'Coach' },
    { value: 'consumer', label: 'Consumer' },
    { value: 'executor', label: 'Executor' },
    { value: 'home_seller', label: 'Home Seller' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'downsizer', label: 'Downsizer' },
    { value: 'diy_seller', label: 'DIY Seller' },
    { value: 'consignor', label: 'Consignor' }
  ];

  const filteredSubcategories = selectedRole === 'all' 
    ? [] 
    : subcategories.filter(sub => sub.account_type === selectedRole);



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
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-600">
            {filteredUsers.length} of {users.length} users
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <AddUserModal 
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadUsers}
      />

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
                onClick={clearFilters}
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
              placeholder="Search by name, email, company, brokerage, phone, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Account Type</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Account Types" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Subcategory</Label>
              <Select 
                value={selectedSubcategory} 
                onValueChange={setSelectedSubcategory}
                disabled={selectedRole === 'all' || filteredSubcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {filteredSubcategories.map(sub => (
                    <SelectItem key={sub.id} value={sub.subcategory_name}>
                      {sub.subcategory_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-2 block">Onboarding Status</Label>
              <Tabs value={onboardingFilter} onValueChange={setOnboardingFilter}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs">Complete</TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-2">No users found</p>
              <p className="text-sm text-slate-400 mb-4">Try adjusting your search or filters</p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map(user => {
            const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
            
            return (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.profile_image_url} />
                      <AvatarFallback className="bg-orange-600 text-white text-xl">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-semibold text-slate-900">{user.full_name}</h3>
                          {user.primary_account_type && (
                            <Badge className={getRoleBadgeColor(user.primary_account_type)}>
                              {user.primary_account_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {!user.onboarding_completed && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              Pending Setup
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-600" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-cyan-600" />
                              {user.phone}
                            </div>
                          )}
                          {(user.company_name || user.brokerage_name) && (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-cyan-600" />
                              {user.company_name || user.brokerage_name}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-cyan-600" />
                            Joined {new Date(user.created_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {user.account_types && user.account_types.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-slate-500 font-medium">Additional Account Types:</span>
                          {user.account_types.filter(r => r !== user.primary_account_type).map((type, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        {user.divisions_access && user.divisions_access.length > 0 && (
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">Divisions:</span> {user.divisions_access.map(d => d.replace(/_/g, ' ')).join(', ')}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 font-mono ml-auto">
                          ID: {user.id.slice(0, 12)}
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