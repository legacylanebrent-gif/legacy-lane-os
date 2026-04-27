import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, AlertCircle, CheckCircle, User, Facebook, Database, Globe, ExternalLink } from 'lucide-react';

const SOURCE_CONFIG = {
  social_ads:  { label: 'Social Ads',  color: 'bg-blue-100 text-blue-700',   icon: Facebook, accent: 'text-blue-600',  page: 'AdminLeadsSocialAds' },
  propstream:  { label: 'Propstream',  color: 'bg-purple-100 text-purple-700', icon: Database, accent: 'text-purple-600', page: 'AdminLeadsPropstream' },
  website:     { label: 'Website',     color: 'bg-cyan-100 text-cyan-700',    icon: Globe,    accent: 'text-cyan-600',  page: 'AdminLeadsWebsite' },
  advertising: { label: 'Advertising', color: 'bg-orange-100 text-orange-700', icon: TrendingUp, accent: 'text-orange-600', page: null },
  referral:    { label: 'Referral',    color: 'bg-green-100 text-green-700',  icon: User,     accent: 'text-green-600', page: null },
  organic:     { label: 'Organic',     color: 'bg-slate-100 text-slate-700',  icon: Globe,    accent: 'text-slate-600', page: null },
};

const getScoreColor = (score) => {
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.Lead.list('-created_date');
    setLeads(data);
    setLoading(false);
  };

  const filtered = leads.filter(lead => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      lead.contact_name?.toLowerCase().includes(q) ||
      lead.contact_email?.toLowerCase().includes(q) ||
      lead.property_address?.toLowerCase().includes(q) ||
      lead.source?.toLowerCase().includes(q);
    const matchSource = sourceFilter === 'all' || lead.source === sourceFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'unassigned' && !lead.routed_to && !lead.converted) ||
      (statusFilter === 'assigned' && lead.routed_to && !lead.converted) ||
      (statusFilter === 'converted' && lead.converted);
    return matchSearch && matchSource && matchStatus;
  });

  const stats = {
    total: leads.length,
    unassigned: leads.filter(l => !l.routed_to && !l.converted).length,
    assigned: leads.filter(l => l.routed_to && !l.converted).length,
    converted: leads.filter(l => l.converted).length,
    social: leads.filter(l => l.source === 'social_ads').length,
    propstream: leads.filter(l => l.source === 'propstream').length,
    website: leads.filter(l => l.source === 'website').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">All Leads — Consolidated</h1>
        <p className="text-slate-600">Every lead from all sources. Use the source pages to add and manage leads by channel.</p>
      </div>

      {/* Source Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <Link to={createPageUrl('AdminLeadsSocialAds')}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Social Ads</p>
                <p className="text-2xl font-bold text-blue-600">{stats.social}</p>
              </div>
              <div className="flex items-center gap-2">
                <Facebook className="w-6 h-6 text-blue-500" />
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('AdminLeadsPropstream')}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Propstream</p>
                <p className="text-2xl font-bold text-purple-600">{stats.propstream}</p>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-purple-500" />
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('AdminLeadsWebsite')}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-cyan-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Website</p>
                <p className="text-2xl font-bold text-cyan-600">{stats.website}</p>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-6 h-6 text-cyan-500" />
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Total Leads</p><p className="text-3xl font-bold mt-1">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Unassigned</p><p className="text-3xl font-bold mt-1 text-orange-600">{stats.unassigned}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Assigned</p><p className="text-3xl font-bold mt-1 text-cyan-600">{stats.assigned}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-slate-500">Converted</p><p className="text-3xl font-bold mt-1 text-green-600">{stats.converted}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input placeholder="Search by name, email, address..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="social_ads">Social Ads</SelectItem>
            <SelectItem value="propstream">Propstream</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="advertising">Advertising</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="organic">Organic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="animate-pulse h-64 bg-slate-100 rounded-lg" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-600">Score</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Contact</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Property</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Source</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Intent</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Value</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan="9" className="p-12 text-center text-slate-400">No leads found</td></tr>
                ) : filtered.map(lead => {
                  const src = SOURCE_CONFIG[lead.source] || { label: lead.source, color: 'bg-slate-100 text-slate-700' };
                  const SrcIcon = src.icon;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${getScoreColor(lead.score || 0)}`}>
                          {lead.score || '—'}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-900">{lead.contact_name || <span className="text-slate-400">—</span>}</td>
                      <td className="p-4">
                        <div className="space-y-0.5">
                          {lead.contact_email && <a href={`mailto:${lead.contact_email}`} className="text-cyan-600 hover:underline block truncate max-w-[160px]">{lead.contact_email}</a>}
                          {lead.contact_phone && <a href={`tel:${lead.contact_phone}`} className="text-slate-600 hover:underline block">{lead.contact_phone}</a>}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 max-w-[180px]">
                        <span className="line-clamp-2">{lead.property_address || '—'}</span>
                      </td>
                      <td className="p-4">
                        <Badge className={`${src.color} flex items-center gap-1 w-fit`}>
                          {SrcIcon && <SrcIcon className="w-3 h-3" />}
                          {src.label}
                        </Badge>
                      </td>
                      <td className="p-4 capitalize text-slate-600">{lead.intent?.replace(/_/g, ' ') || '—'}</td>
                      <td className="p-4 font-semibold text-green-700">{lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '—'}</td>
                      <td className="p-4">
                        {lead.converted ? <Badge className="bg-green-100 text-green-800">Converted</Badge>
                          : lead.routed_to ? <Badge className="bg-cyan-100 text-cyan-800">Assigned</Badge>
                          : <Badge className="bg-orange-100 text-orange-800">New</Badge>}
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(lead.created_date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t text-sm text-slate-500">
            Showing {filtered.length} of {leads.length} leads
          </div>
        </Card>
      )}
    </div>
  );
}