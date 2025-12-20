import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserCircle, Mail, Phone, Building2, Calendar } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, users]);

  const loadUsers = async () => {
    try {
      const data = await base44.asServiceRole.entities.User.list();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.primary_role === selectedRole);
    }

    setFilteredUsers(filtered);
  };

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

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'platform_ops', label: 'Platform Ops' },
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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">User Management</h1>
        <p className="text-slate-600">{users.length} total users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          {roleOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map(user => {
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
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">{user.full_name}</h3>
                        {user.primary_role && (
                          <Badge className={getRoleBadgeColor(user.primary_role)}>
                            {user.primary_role.replace('_', ' ')}
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
                        {user.company_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyan-600" />
                            {user.company_name}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-600" />
                          Joined {new Date(user.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {user.roles && user.roles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {user.divisions_access && user.divisions_access.length > 0 && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Divisions:</span> {user.divisions_access.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No users found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}