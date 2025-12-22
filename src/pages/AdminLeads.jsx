import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Target, TrendingUp, MapPin, Clock } from 'lucide-react';

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [searchQuery, sourceFilter, leads]);

  const loadLeads = async () => {
    try {
      const data = await base44.entities.Lead.list();
      setLeads(data);
      setFilteredLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contact_id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
    }

    setFilteredLeads(filtered);
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIntentBadge = (intent) => {
    const configs = {
      sell_home: { label: 'Sell Home', className: 'bg-blue-100 text-blue-700' },
      buy_home: { label: 'Buy Home', className: 'bg-green-100 text-green-700' },
      estate_sale: { label: 'Estate Sale', className: 'bg-purple-100 text-purple-700' },
      find_items: { label: 'Find Items', className: 'bg-pink-100 text-pink-700' },
      invest: { label: 'Invest', className: 'bg-orange-100 text-orange-700' },
      learn: { label: 'Learn', className: 'bg-cyan-100 text-cyan-700' },
      hire_vendor: { label: 'Hire Vendor', className: 'bg-indigo-100 text-indigo-700' }
    };
    const config = configs[intent] || { label: intent, className: 'bg-slate-100 text-slate-700' };
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
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Leads Management</h1>
        <p className="text-slate-600">{leads.length} total leads</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by address or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">All Sources</option>
          <option value="estate_finder">Estate Finder</option>
          <option value="home_value_tool">Home Value Tool</option>
          <option value="marketplace_inquiry">Marketplace Inquiry</option>
          <option value="referral">Referral</option>
          <option value="advertising">Advertising</option>
          <option value="organic">Organic</option>
        </select>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {filteredLeads.map(lead => (
          <Card key={lead.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {getIntentBadge(lead.intent)}
                    {lead.score !== undefined && (
                      <div className="flex items-center gap-2 mt-2">
                        <Target className={`w-4 h-4 ${getScoreColor(lead.score)}`} />
                        <span className={`font-semibold ${getScoreColor(lead.score)}`}>
                          Score: {lead.score}
                        </span>
                      </div>
                    )}
                  </div>
                  {lead.converted && (
                    <Badge className="bg-green-600 text-white">Converted</Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  {lead.property_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-cyan-600" />
                      <span>{lead.property_address}</span>
                    </div>
                  )}

                  {lead.estimated_value && (
                    <div>
                      <span className="font-medium">Est. Value:</span> ${lead.estimated_value.toLocaleString()}
                    </div>
                  )}

                  {lead.timeline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="capitalize">{lead.timeline.replace('_', '-')}</span>
                    </div>
                  )}

                  {lead.situation && (
                    <div>
                      <span className="font-medium">Situation:</span> <span className="capitalize">{lead.situation}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 pt-2 border-t">
                    <span className="font-medium">Source:</span> {lead.source.replace('_', ' ')}
                    {lead.source_details && <span> - {lead.source_details}</span>}
                  </div>

                  {lead.routed_to && (
                    <div className="text-xs">
                      <Badge variant="outline" className="text-green-700 border-green-300">Assigned</Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No leads found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}