import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Users, TrendingUp, DollarSign, Phone, Mail } from 'lucide-react';
import ContactCard from '@/components/crm/ContactCard';

export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactData, dealData] = await Promise.all([
        base44.entities.Contact.list('-last_contact_date'),
        base44.entities.Deal.list('-created_date')
      ]);
      setContacts(contactData);
      setDeals(dealData);
    } catch (error) {
      console.error('Error loading CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchQuery.trim() === '' || 
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'all') return matchesSearch;
    return matchesSearch && contact.roles?.includes(filter);
  });

  const stats = {
    totalContacts: contacts.length,
    activeDeals: deals.filter(d => !['won', 'lost'].includes(d.stage)).length,
    totalValue: deals.filter(d => d.stage !== 'lost').reduce((sum, d) => sum + (d.value || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              CRM & Contacts
            </h1>
            <p className="text-slate-600">Manage relationships across the entire platform</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl('Pipeline')}>
              <Button variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Pipeline
              </Button>
            </Link>
            <Button className="bg-gold-600 hover:bg-gold-700">
              <Plus className="w-4 h-4 mr-2" />
              New Contact
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Contacts</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{stats.totalContacts}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Deals</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">{stats.activeDeals}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pipeline Value</p>
                  <p className="text-3xl font-bold text-navy-900 mt-1">${stats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="seller">Sellers</TabsTrigger>
            <TabsTrigger value="buyer">Buyers</TabsTrigger>
            <TabsTrigger value="executor">Executors</TabsTrigger>
            <TabsTrigger value="investor">Investors</TabsTrigger>
            <TabsTrigger value="vendor">Vendors</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredContacts.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No contacts found
                </h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(contact => (
                  <Link key={contact.id} to={createPageUrl(`ContactDetail?id=${contact.id}`)}>
                    <ContactCard contact={contact} />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}