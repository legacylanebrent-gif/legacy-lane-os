import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Search, UserCircle, Mail, Phone, Building2, Calendar, Plus, X, SlidersHorizontal, Edit, Trash2, Check, XCircle, Power, ArrowLeft, ClipboardList, Store } from 'lucide-react';
import AddUserModal from '@/components/admin/AddUserModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [subcategories, setSubcategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUsers();
    loadSubcategories();
    loadReferrals();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, selectedSubcategory, users]);

  useEffect(() => {
    setSelectedSubcategory('all');
  }, [selectedRole]);

  const loadUsers = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      const currentUser = me;
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const data = await base44.entities.User.list('-created_date', 1000);
      
      if (!data || data.length === 0) {
        setUsers([]);
        setFilteredUsers([]);
        setLoading(false);
        return;
      }
      
      const usersWithDefaults = data.map(user => ({
        ...user,
        primary_account_type: user.primary_account_type || 'consumer',
        full_name: user.full_name || user.email || 'Unknown User'
      }));
      
      setUsers(usersWithDefaults);
      setFilteredUsers(usersWithDefaults);
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

  const loadReferrals = async () => {
    try {
      const data = await base44.entities.Referral.list();
      console.log('Loaded referrals:', data);
      setReferrals(data || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
      setReferrals([]);
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

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedSubcategory('all');
  };

  const hasActiveFilters = searchQuery || selectedRole !== 'all' || selectedSubcategory !== 'all';

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
    { value: 'consignor', label: 'Consignor' }
  ];

  const filteredSubcategories = selectedRole === 'all' 
    ? [] 
    : subcategories.filter(sub => sub.account_type === selectedRole);

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowAddModal(true);
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await base44.entities.User.delete(userId);
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await base44.entities.User.update(user.id, {
        account_status: user.account_status === 'active' ? 'disabled' : 'active'
      });
      loadUsers();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update user status');
    }
  };

  const handleApprove = async (userId) => {
    try {
      await base44.entities.User.update(userId, {
        account_status: 'active'
      });
      loadUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const handleDeny = async (userId) => {
    try {
      await base44.entities.User.update(userId, {
        account_status: 'denied'
      });
      loadUsers();
    } catch (error) {
      console.error('Error denying user:', error);
      alert('Failed to deny user');
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

  // Pending applications
  const pendingClaims = users.filter(u => u.operator_status === 'pending_verification');
  const pendingResellers = users.filter(u => u.reseller_application_submitted === true && u.primary_account_type !== 'reseller');

  const handleApproveClaim = async (user) => {
    await base44.entities.User.update(user.id, {
      operator_status: 'verified',
      account_status: 'active',
    });
    await base44.functions.invoke('sendNotification', {
      user_id: user.id,
      type: 'system',
      title: '✅ Company Claim Approved!',
      message: `Your claim for ${user.claimed_company_name || 'your company'} has been approved. Welcome to EstateSalen.com!`,
      link_to_page: 'OperatorDashboard',
    });
    loadUsers();
  };

  const handleDenyClaim = async (user) => {
    await base44.entities.User.update(user.id, {
      operator_status: 'denied',
      primary_account_type: 'consumer',
      account_status: 'active',
    });
    await base44.functions.invoke('sendNotification', {
      user_id: user.id,
      type: 'system',
      title: 'Company Claim Update',
      message: `We were unable to verify your claim for ${user.claimed_company_name || 'this company'}. Please contact support for assistance.`,
    });
    loadUsers();
  };

  const handleApproveReseller = async (user) => {
    await base44.entities.User.update(user.id, {
      primary_account_type: 'reseller',
      reseller_application_submitted: false,
      account_status: 'active',
    });
    await base44.functions.invoke('sendNotification', {
      user_id: user.id,
      type: 'system',
      title: '🎉 Reseller Application Approved!',
      message: 'Congratulations! Your reseller application has been approved. You now have access to buyout opportunities and the reseller dashboard.',
      link_to_page: 'ResellerDashboard',
    });
    loadUsers();
  };

  const handleDenyReseller = async (user) => {
    await base44.entities.User.update(user.id, {
      reseller_application_submitted: false,
    });
    await base44.functions.invoke('sendNotification', {
      user_id: user.id,
      type: 'system',
      title: 'Reseller Application Update',
      message: 'Thank you for your interest. Your reseller application was not approved at this time. Please contact support for more information.',
    });
    loadUsers();
  };

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

      {/* Pending Applications Panel */}
      {(pendingClaims.length > 0 || pendingResellers.length > 0) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <ClipboardList className="w-5 h-5" />
              Pending Applications
              <Badge className="bg-amber-500 text-white ml-1">{pendingClaims.length + pendingResellers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingClaims.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{u.full_name} <span className="text-slate-400 font-normal">— {u.email}</span></p>
                    <p className="text-xs text-slate-500">Company Claim: <strong>{u.claimed_company_name || 'Unknown'}</strong> · {u.company_city}, {u.company_state}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8" onClick={() => handleApproveClaim(u)}>
                    <Check className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1 h-8" onClick={() => handleDenyClaim(u)}>
                    <XCircle className="w-3.5 h-3.5" /> Deny
                  </Button>
                </div>
              </div>
            ))}
            {pendingResellers.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{u.full_name} <span className="text-slate-400 font-normal">— {u.email}</span></p>
                    <p className="text-xs text-slate-500">Reseller Application · Applied {u.reseller_application_date ? new Date(u.reseller_application_date).toLocaleDateString() : 'recently'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-8" onClick={() => handleApproveReseller(u)}>
                    <Check className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 gap-1 h-8" onClick={() => handleDenyReseller(u)}>
                    <XCircle className="w-3.5 h-3.5" /> Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}



      <AddUserModal 
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingUser(null);
        }}
        onSuccess={loadUsers}
        editUser={editingUser}
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

          <div className="grid md:grid-cols-2 gap-4">
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
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
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Referrer Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
                    const status = user.account_status || 'active';
                    const referral = referrals.find(r => r.referred_user_id === user.id);
                    const referrerEmail = referral?.referrer_email || '';
                    
                    if (user.primary_account_type === 'estate_sale_operator' && referral) {
                      console.log(`User ${user.email} has referral:`, referral);
                    }
                    
                    return (
                      <TableRow key={user.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profile_image_url} />
                            <AvatarFallback className="bg-orange-600 text-white text-sm">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell className="text-slate-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(user.primary_account_type)}>
                            {user.primary_account_type?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{user.phone || '-'}</TableCell>
                        <TableCell className="text-slate-600">{user.company_name || user.brokerage_name || '-'}</TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {referrerEmail || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === 'active' ? 'default' : status === 'disabled' ? 'secondary' : 'destructive'}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            {status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(user.id)}
                                  title="Approve"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeny(user.id)}
                                  title="Deny"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user)}
                              title={status === 'active' ? 'Disable' : 'Enable'}
                              className={status === 'active' ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}