import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, Mail, MapPin, ArrowUp, ArrowDown, Search, Filter, X, DollarSign,
  Calendar, Clock, AlertCircle, CheckCheck
} from 'lucide-react';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  scheduled: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  lost: 'bg-slate-100 text-slate-700',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const LEAD_TYPE_LABELS = {
  buyout: 'Buyout',
  reseller: 'Reseller',
  cleanout: 'Cleanout',
  both: 'Buyout + Reseller',
};

const SITUATION_LABELS = {
  probate: 'Probate',
  divorce: 'Divorce',
  downsizing: 'Downsizing',
  relocation: 'Relocation',
  foreclosure: 'Foreclosure',
  hoarder: 'Hoarder',
  standard: 'Standard',
};

const ESTATE_SIZE_LABELS = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  whole_house: 'Whole House',
};

const TIMELINE_LABELS = {
  immediate: 'Immediate',
  within_2_weeks: '≤ 2 Weeks',
  within_30_days: '≤ 30 Days',
  within_60_days: '≤ 60 Days',
  flexible: 'Flexible',
};

// ─── Column definitions ──────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'homeowner_name', label: 'Homeowner', sortable: true },
  { key: 'lead_type', label: 'Type', sortable: true },
  { key: 'estate_size', label: 'Size', sortable: true },
  { key: 'property_address', label: 'Location', sortable: true },
  { key: 'situation', label: 'Situation', sortable: true },
  { key: 'timeline', label: 'Timeline', sortable: true },
  { key: 'estimated_value', label: 'Est. Value', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'source', label: 'Source', sortable: true },
  { key: 'follow_up_date', label: 'Follow-Up', sortable: true },
  { key: 'email', label: 'Contact', sortable: false },
];

export default function MyResellerLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', lead_type: 'all', situation: 'all' });
  const [sortKey, setSortKey] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedLead, setExpandedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await base44.entities.ResellerLead.list('-created_date', 200);
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const clearSearch = () => setSearch('');

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  // ─── Filter + Sort + Search ─────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.homeowner_name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.property_address || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.status !== 'all') result = result.filter(l => l.status === filters.status);
    if (filters.priority !== 'all') result = result.filter(l => l.priority === filters.priority);
    if (filters.lead_type !== 'all') result = result.filter(l => l.lead_type === filters.lead_type);
    if (filters.situation !== 'all') result = result.filter(l => l.situation === filters.situation);

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [leads, search, filters, sortKey, sortDir]);

  // ─── Render cell value ──────────────────────────────────────────────────────
  const renderCell = (lead, colKey) => {
    switch (colKey) {
      case 'homeowner_name':
        return <span className="font-semibold text-slate-900">{lead.homeowner_name}</span>;
      case 'lead_type':
        return <Badge variant="outline" className="text-xs">{LEAD_TYPE_LABELS[lead.lead_type] || lead.lead_type}</Badge>;
      case 'estate_size':
        return <span className="text-xs text-slate-600">{ESTATE_SIZE_LABELS[lead.estate_size] || lead.estate_size}</span>;
      case 'property_address':
        return (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[180px]">{lead.property_address || '—'}</span>
          </div>
        );
      case 'situation':
        return <span className="text-xs text-slate-600">{SITUATION_LABELS[lead.situation] || lead.situation}</span>;
      case 'timeline':
        return <span className="text-xs text-slate-600">{TIMELINE_LABELS[lead.timeline] || lead.timeline}</span>;
      case 'estimated_value':
        return lead.estimated_value ? (
          <span className="text-xs font-semibold text-slate-900">${lead.estimated_value.toLocaleString()}</span>
        ) : <span className="text-xs text-slate-400">—</span>;
      case 'priority':
        return (
          <Badge className={`text-xs border ${PRIORITY_COLORS[lead.priority] || 'bg-slate-100'}`}>
            {lead.priority}
          </Badge>
        );
      case 'status':
        return (
          <Badge className={`text-xs ${STATUS_COLORS[lead.status] || 'bg-slate-100'}`}>
            {lead.status?.replace(/_/g, ' ')}
          </Badge>
        );
      case 'source':
        return <span className="text-xs text-slate-500">{lead.source?.replace(/_/g, ' ')}</span>;
      case 'follow_up_date':
        return lead.follow_up_date ? (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Calendar className="w-3 h-3" />
            {lead.follow_up_date.slice(0, 10)}
          </div>
        ) : <span className="text-xs text-slate-400">—</span>;
      case 'email':
        return (
          <div className="flex items-center gap-2">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="text-xs text-slate-500 hover:text-orange-600" title={lead.email}>
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="text-xs text-slate-500 hover:text-orange-600" title={lead.phone}>
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      default:
        return <span className="text-xs text-slate-600">{lead[colKey]}</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Reseller Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage buyout, reseller, and cleanout opportunities from home sellers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'New', count: leads.filter(l => l.status === 'new').length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Qualified', count: leads.filter(l => l.status === 'qualified').length, color: 'bg-purple-50 text-purple-700' },
          { label: 'Scheduled', count: leads.filter(l => l.status === 'scheduled').length, color: 'bg-cyan-50 text-cyan-700' },
          { label: 'In Progress', count: leads.filter(l => l.status === 'in_progress').length, color: 'bg-orange-50 text-orange-700' },
          { label: 'Completed', count: leads.filter(l => l.status === 'completed').length, color: 'bg-green-50 text-green-700' },
          { label: 'Declined', count: leads.filter(l => l.status === 'declined').length, color: 'bg-red-50 text-red-700' },
          { label: 'Lost', count: leads.filter(l => l.status === 'lost').length, color: 'bg-slate-50 text-slate-600' },
        ].map(stat => (
          <Card key={stat.label} className={`${stat.color} border-0 shadow-none`}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-xs font-medium">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search & Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, phone, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters || activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(f => !f)}
          className={`gap-2 ${showFilters || activeFilterCount > 0 ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="bg-white text-orange-600 h-5 min-w-5 flex items-center justify-center px-1 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilters({ status: 'all', priority: 'all', lead_type: 'all', situation: 'all' }); setShowFilters(false); }}
            className="text-slate-500 text-xs gap-1"
          >
            <X className="w-3 h-3" /> Clear all
          </Button>
        )}
      </div>

      {/* ── Filter Row ──────────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Status</label>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.keys(STATUS_COLORS).map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Priority</label>
            <Select value={filters.priority} onValueChange={v => setFilters(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Lead Type</label>
            <Select value={filters.lead_type} onValueChange={v => setFilters(f => ({ ...f, lead_type: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="buyout">Buyout</SelectItem>
                <SelectItem value="reseller">Reseller</SelectItem>
                <SelectItem value="cleanout">Cleanout</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Situation</label>
            <Select value={filters.situation} onValueChange={v => setFilters(f => ({ ...f, situation: v }))}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.entries(SITUATION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Leads Table ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={`px-3 py-3 text-left font-semibold text-slate-600 text-xs whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-slate-900 select-none' : ''}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {search || activeFilterCount > 0
                        ? 'No leads match your search or filters'
                        : 'No leads yet'}
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => (
                    <React.Fragment key={lead.id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          expandedLead === lead.id ? 'bg-orange-50/50' : ''
                        }`}
                        onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}
                      >
                        {COLUMNS.map(col => (
                          <td key={col.key} className="px-3 py-3 whitespace-nowrap">
                            {renderCell(lead, col.key)}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right">
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform inline-block ${
                            expandedLead === lead.id ? 'rotate-90' : ''
                          }`} />
                        </td>
                      </tr>
                      {/* ── Expanded Row: Notes ──────────────────────────────────── */}
                      {expandedLead === lead.id && (
                        <tr className="bg-orange-50/30">
                          <td colSpan={COLUMNS.length + 1} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {lead.notes && (
                                <div className="md:col-span-2">
                                  <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                                  <p className="text-slate-700">{lead.notes}</p>
                                </div>
                              )}
                              <div className="space-y-2">
                                {lead.high_value_items && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">High-Value Items</p>
                                    <p className="text-slate-700">{lead.high_value_items}</p>
                                  </div>
                                )}
                                {lead.budget_range && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 mb-1">Budget Range</p>
                                    <p className="text-slate-700">{lead.budget_range}</p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    Created: {new Date(lead.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                                {lead.last_contacted && (
                                  <div className="flex items-center gap-2">
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs text-slate-500">
                                      Last Contact: {new Date(lead.last_contacted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                )}
                                {lead.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {lead.tags.map(tag => (
                                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChevronRight({ className }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}