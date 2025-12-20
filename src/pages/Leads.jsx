import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, Users, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import LeadCard from '@/components/leads/LeadCard';
import LeadRoutingModal from '@/components/leads/LeadRoutingModal';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showRoutingModal, setShowRoutingModal] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const leadData = await base44.entities.Lead.list('-created_date');
      setLeads(leadData);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery.trim() === '' || 
      lead.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.source?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'unassigned') return matchesSearch && !lead.routed_to;
    if (filter === 'converted') return matchesSearch && lead.converted;
    return matchesSearch;
  });

  const stats = {
    total: leads.length,
    unassigned: leads.filter(l => !l.routed_to).length,
    converted: leads.filter(l => l.converted).length,
    avgScore: Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / (leads.length || 1))
  };

  const handleRoute = (lead) => {
    setSelectedLead(lead);
    setShowRoutingModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cream-50 to-sage-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-navy-900 mb-2">
              Lead Intelligence
            </h1>
            <p className="text-slate-600">Smart routing and lead management</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Leads</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Unassigned</CardTitle>
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.unassigned}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Converted</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.converted}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Score</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy-900">{stats.avgScore}</div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search leads by property, source, or intent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All Leads ({stats.total})</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned ({stats.unassigned})</TabsTrigger>
            <TabsTrigger value="converted">Converted ({stats.converted})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredLeads.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  No leads found
                </h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onRoute={handleRoute} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showRoutingModal && selectedLead && (
        <LeadRoutingModal
          lead={selectedLead}
          onClose={() => {
            setShowRoutingModal(false);
            setSelectedLead(null);
          }}
          onSuccess={() => {
            setShowRoutingModal(false);
            setSelectedLead(null);
            loadLeads();
          }}
        />
      )}
    </div>
  );
}