import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Zap, Loader, ChevronLeft, ChevronRight, Eye, Mail, Phone, MapPin, Clock, Home, DollarSign, User, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

const SCORE_COLORS = {
  Priority: 'text-green-600 bg-green-100',
  Strong: 'text-emerald-600 bg-emerald-100',
  Moderate: 'text-yellow-600 bg-yellow-100',
  Low: 'text-red-600 bg-red-100',
};

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  ready: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  replied: 'bg-cyan-100 text-cyan-700',
  interested: 'bg-green-100 text-green-700',
  not_interested: 'bg-red-100 text-red-700',
};

const OPERATOR_STATUS_COLORS = {
  not_sent: 'bg-slate-100 text-slate-700',
  sent_to_operator: 'bg-purple-100 text-purple-700',
  operator_accepted: 'bg-green-100 text-green-700',
  operator_declined: 'bg-red-100 text-red-700',
  contacted_agent: 'bg-cyan-100 text-cyan-700',
};

export default function AdminLeadsPropstream() {
  const [listings, setListings] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [scoring, setScoring] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [listingsData, users] = await Promise.all([
      base44.entities.PropstreamREListing.list('-created_date'),
      base44.entities.User.list()
    ]);
    setListings(listingsData);
    setOperators(users.filter(u =>
      u.primary_account_type === 'estate_sale_operator' ||
      u.account_types?.includes('estate_sale_operator')
    ));
    setLoading(false);
  };

  const handleAssign = async (listingId, operatorId) => {
    await base44.entities.PropstreamREListing.update(listingId, {
      assigned_operator_id: operatorId,
      operator_status: 'sent_to_operator'
    });
    setShowDetail(false);
    loadData();
  };

  const handleStatusUpdate = async (listingId, field, value) => {
    await base44.entities.PropstreamREListing.update(listingId, { [field]: value });
    setShowDetail(false);
    loadData();
  };

  const handleScoreListings = async () => {
    setScoring(true);
    try {
      await base44.functions.invoke('scorePropstreamListings', {});
      loadData();
    } finally {
      setScoring(false);
    }
  };

  // Stats
  const total = listings.length;
  const unassigned = listings.filter(l => !l.assigned_operator_id).length;
  const assigned = listings.filter(l => l.assigned_operator_id && l.email_status !== 'interested').length;
  const interested = listings.filter(l => l.email_status === 'interested').length;

  // Filtering
  const filtered = listings.filter(listing => {
    const q = search.toLowerCase();
    const ownerName = [listing.owner_1_first_name, listing.owner_1_last_name].filter(Boolean).join(' ');
    const match = !search ||
      ownerName.toLowerCase().includes(q) ||
      listing.property_address?.toLowerCase().includes(q) ||
      listing.email_1?.toLowerCase().includes(q) ||
      listing.phone_1?.toLowerCase().includes(q) ||
      listing.propstream_property_id?.toLowerCase().includes(q) ||
      listing.city?.toLowerCase().includes(q);
    if (filter === 'unassigned') return match && !listing.assigned_operator_id;
    if (filter === 'assigned') return match && listing.assigned_operator_id && listing.email_status !== 'interested';
    if (filter === 'interested') return match && listing.email_status === 'interested';
    return match;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getOwnerName = (l) => {
    const full = [l.owner_1_first_name, l.owner_1_last_name].filter(Boolean).join(' ');
    return full || l.owner_name || 'Unknown';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Propstream Probate Leads</h1>
          </div>
          <p className="text-slate-600">Imported PropStream listings — absentee owners, inherited, distressed properties</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Total</p><p className="text-3xl font-bold">{total}</p></div><TrendingUp className="w-8 h-8 text-slate-300" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Unassigned</p><p className="text-3xl font-bold text-orange-600">{unassigned}</p></div><AlertCircle className="w-8 h-8 text-orange-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Assigned</p><p className="text-3xl font-bold text-purple-600">{assigned}</p></div><User className="w-8 h-8 text-purple-200" /></CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-600 mb-1">Interested</p><p className="text-3xl font-bold text-green-600">{interested}</p></div><CheckCircle className="w-8 h-8 text-green-200" /></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <Tabs value={filter} onValueChange={(v) => { setFilter(v); setCurrentPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">All ({total})</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned ({unassigned})</TabsTrigger>
            <TabsTrigger value="assigned">Assigned ({assigned})</TabsTrigger>
            <TabsTrigger value="interested">Interested ({interested})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Search by name, address, phone, email..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="flex-1" />
        <Button onClick={handleScoreListings} disabled={scoring} variant="outline" className="gap-2">
          {scoring ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {scoring ? 'Scoring...' : 'Score Leads'}
        </Button>
      </div>

      {/* Page Size */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{filtered.length} leads</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Rows per page:</label>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1 text-xs">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-16 text-center text-slate-400">
          <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No leads found</p>
          <p className="text-sm mt-1">Import listings from PropStream to get started</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Score</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Owner</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Property Address</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Contact</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Indicators</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Est. Value</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="p-3 text-xs text-slate-500 font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map(listing => {
                const label = listing.estate_sale_score_label || 'Low';
                const indicators = [];
                if (listing.probate_indicator) indicators.push('Probate');
                if (listing.inherited_indicator) indicators.push('Inherited');
                if (listing.absentee_owner) indicators.push('Absentee');
                if (listing.vacant) indicators.push('Vacant');
                if (listing.senior_owner_indicator) indicators.push('Senior');
                if (listing.deceased_owner) indicators.push('Deceased');
                if (listing.divorce_indicator) indicators.push('Divorce');
                if (listing.preforeclosure_indicator) indicators.push('Pre-FC');
                if (listing.foreclosure_indicator) indicators.push('Foreclosure');

                return (
                  <tr key={listing.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelected(listing); setShowDetail(true); }}>
                    <td className="p-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${SCORE_COLORS[label] || 'text-slate-600 bg-slate-100'}`}>
                        {listing.estate_sale_score || 0}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-800">{getOwnerName(listing)}</p>
                      {listing.propstream_property_id && <p className="text-xs text-slate-400">PS: {listing.propstream_property_id}</p>}
                    </td>
                    <td className="p-3 max-w-[200px]">
                      <p className="font-medium truncate" title={listing.property_address}>{listing.property_address}</p>
                      <p className="text-xs text-slate-400">{listing.city}, {listing.state} {listing.zip}</p>
                    </td>
                    <td className="p-3">
                      {listing.email_1 && (
                        <a href={`mailto:${listing.email_1}`} className="text-xs text-blue-600 hover:underline truncate block max-w-[160px]" onClick={e => e.stopPropagation()}>
                          <Mail className="w-3 h-3 inline mr-1" />{listing.email_1}
                        </a>
                      )}
                      {listing.phone_1 && (
                        <a href={`tel:${listing.phone_1}`} className="text-xs text-slate-600 hover:underline block" onClick={e => e.stopPropagation()}>
                          <Phone className="w-3 h-3 inline mr-1" />{listing.phone_1}
                        </a>
                      )}
                      {!listing.email_1 && !listing.phone_1 && <span className="text-slate-400 text-xs">No contact</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {indicators.length > 0 ? indicators.slice(0, 3).map(ind => (
                          <Badge key={ind} className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">{ind}</Badge>
                        )) : <span className="text-slate-400 text-xs">—</span>}
                        {indicators.length > 3 && <Badge className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0">+{indicators.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">
                      {listing.estimated_value ? `$${listing.estimated_value.toLocaleString()}` : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-3">
                      {listing.assigned_operator_id ? (
                        <Badge className={OPERATOR_STATUS_COLORS[listing.operator_status] || 'bg-slate-100 text-slate-700'}>
                          {(listing.operator_status || 'assigned').replace(/_/g, ' ')}
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">New</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setSelected(listing); setShowDetail(true); }}>
                          <Eye className="w-3 h-3 mr-1" /> View
                        </Button>
                        {!listing.assigned_operator_id && (
                          <Select onValueChange={(opId) => handleAssign(listing.id, opId)}>
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} leads
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => goToPage(1)} disabled={currentPage === 1} className="h-8 px-2">
              <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-1" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-8 px-2">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages || 1}</span>
            <Button size="sm" variant="outline" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 px-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="h-8 px-2">
              <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Propstream Lead Detail</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              {/* Score + Owner Header */}
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${SCORE_COLORS[selected.estate_sale_score_label] || 'text-slate-600 bg-slate-100'}`}>
                  {selected.estate_sale_score || 0}
                </div>
                <div>
                  <p className="font-bold text-lg">{getOwnerName(selected)}</p>
                  <div className="flex gap-2 mt-1">
                    {selected.estate_sale_score_label && <Badge className={SCORE_COLORS[selected.estate_sale_score_label]}>{selected.estate_sale_score_label}</Badge>}
                    {selected.propstream_property_id && <p className="text-xs text-slate-500">PS ID: {selected.propstream_property_id}</p>}
                    {selected.mls_number && <p className="text-xs text-slate-500">MLS: {selected.mls_number}</p>}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm">Contact Information</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {selected.email_1 && <div><p className="text-xs text-slate-500">Email 1</p><a href={`mailto:${selected.email_1}`} className="text-cyan-600 hover:underline break-all">{selected.email_1}</a></div>}
                  {selected.email_2 && <div><p className="text-xs text-slate-500">Email 2</p><a href={`mailto:${selected.email_2}`} className="text-cyan-600 hover:underline break-all">{selected.email_2}</a></div>}
                  {selected.email_3 && <div><p className="text-xs text-slate-500">Email 3</p><a href={`mailto:${selected.email_3}`} className="text-cyan-600 hover:underline break-all">{selected.email_3}</a></div>}
                  {selected.email_4 && <div><p className="text-xs text-slate-500">Email 4</p><a href={`mailto:${selected.email_4}`} className="text-cyan-600 hover:underline break-all">{selected.email_4}</a></div>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mt-2">
                  {selected.phone_1 && <div><p className="text-xs text-slate-500">Phone 1{selected.phone_1_type ? ` (${selected.phone_1_type})` : ''}</p><a href={`tel:${selected.phone_1}`} className="text-cyan-600 hover:underline">{selected.phone_1}</a>{selected.phone_1_dnc && <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">DNC</Badge>}</div>}
                  {selected.phone_2 && <div><p className="text-xs text-slate-500">Phone 2{selected.phone_2_type ? ` (${selected.phone_2_type})` : ''}</p><a href={`tel:${selected.phone_2}`} className="text-cyan-600 hover:underline">{selected.phone_2}</a>{selected.phone_2_dnc && <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">DNC</Badge>}</div>}
                  {selected.phone_3 && <div><p className="text-xs text-slate-500">Phone 3{selected.phone_3_type ? ` (${selected.phone_3_type})` : ''}</p><a href={`tel:${selected.phone_3}`} className="text-cyan-600 hover:underline">{selected.phone_3}</a>{selected.phone_3_dnc && <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">DNC</Badge>}</div>}
                  {selected.phone_4 && <div><p className="text-xs text-slate-500">Phone 4{selected.phone_4_type ? ` (${selected.phone_4_type})` : ''}</p><a href={`tel:${selected.phone_4}`} className="text-cyan-600 hover:underline">{selected.phone_4}</a>{selected.phone_4_dnc && <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">DNC</Badge>}</div>}
                  {selected.phone_5 && <div><p className="text-xs text-slate-500">Phone 5{selected.phone_5_type ? ` (${selected.phone_5_type})` : ''}</p><a href={`tel:${selected.phone_5}`} className="text-cyan-600 hover:underline">{selected.phone_5}</a>{selected.phone_5_dnc && <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">DNC</Badge>}</div>}
                </div>
              </div>

              {/* Property Address */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm"><MapPin className="w-4 h-4 inline mr-1" />Property Address</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.property_address && <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p>{selected.property_address}{selected.unit_number ? `, Unit ${selected.unit_number}` : ''}</p></div>}
                  <div><p className="text-xs text-slate-500">City</p><p>{selected.city || '—'}</p></div>
                  <div><p className="text-xs text-slate-500">State</p><p>{selected.state || '—'}</p></div>
                  <div><p className="text-xs text-slate-500">ZIP</p><p>{selected.zip || '—'}</p></div>
                  <div><p className="text-xs text-slate-500">County</p><p>{selected.county || '—'}</p></div>
                  {selected.fips_code && <div><p className="text-xs text-slate-500">FIPS</p><p>{selected.fips_code}</p></div>}
                  {selected.apn && <div><p className="text-xs text-slate-500">APN</p><p>{selected.apn}</p></div>}
                </div>
              </div>

              {/* Mailing Address */}
              {(selected.owner_mailing_address || selected.mailing_care_of_name) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Mailing Address</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.mailing_care_of_name && <div className="col-span-2"><p className="text-xs text-slate-500">Care Of</p><p>{selected.mailing_care_of_name}</p></div>}
                    {selected.owner_mailing_address && <div className="col-span-2"><p className="text-xs text-slate-500">Address</p><p>{selected.owner_mailing_address}{selected.owner_mailing_unit ? `, Unit ${selected.owner_mailing_unit}` : ''}</p></div>}
                    <div><p className="text-xs text-slate-500">City</p><p>{selected.owner_mailing_city || '—'}</p></div>
                    <div><p className="text-xs text-slate-500">State</p><p>{selected.owner_mailing_state || '—'}</p></div>
                    <div><p className="text-xs text-slate-500">ZIP</p><p>{selected.owner_mailing_zip || '—'}</p></div>
                    {selected.owner_mailing_county && <div><p className="text-xs text-slate-500">County</p><p>{selected.owner_mailing_county}</p></div>}
                    {selected.do_not_mail && <div className="col-span-2"><Badge className="bg-red-100 text-red-700">Do Not Mail</Badge></div>}
                  </div>
                </div>
              )}

              {/* Owner Details */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm">Owner Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.owner_2_first_name && <div><p className="text-xs text-slate-500">Co-Owner</p><p>{[selected.owner_2_first_name, selected.owner_2_last_name].filter(Boolean).join(' ')}</p></div>}
                  {selected.ownership_length_years > 0 && <div><p className="text-xs text-slate-500">Years Owned</p><p>{selected.ownership_length_years}</p></div>}
                  <div><p className="text-xs text-slate-500">Owner Occupied</p><p>{selected.owner_occupied ? 'Yes' : 'No'}</p></div>
                  {selected.litigator && <div><p className="text-xs text-slate-500">Litigator</p><p>Yes</p></div>}
                  {selected.deceased_owner && <div><p className="text-xs text-slate-500">Deceased Owner</p><p>Yes</p></div>}
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm"><Home className="w-4 h-4 inline mr-1" />Property Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {selected.property_type && <div><p className="text-xs text-slate-500">Property Type</p><p>{selected.property_type}</p></div>}
                  {selected.property_status && <div><p className="text-xs text-slate-500">Property Status</p><p>{selected.property_status}</p></div>}
                  {selected.beds > 0 && <div><p className="text-xs text-slate-500">Bedrooms</p><p>{selected.beds}</p></div>}
                  {selected.baths > 0 && <div><p className="text-xs text-slate-500">Bathrooms</p><p>{selected.baths}</p></div>}
                  {selected.square_feet > 0 && <div><p className="text-xs text-slate-500">Sq Ft</p><p>{selected.square_feet.toLocaleString()}</p></div>}
                  {selected.lot_size && <div><p className="text-xs text-slate-500">Lot Size</p><p>{selected.lot_size}</p></div>}
                  {selected.year_built > 0 && <div><p className="text-xs text-slate-500">Year Built</p><p>{selected.year_built}</p></div>}
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm"><DollarSign className="w-4 h-4 inline mr-1" />Financials</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {selected.estimated_value > 0 && <div><p className="text-xs text-slate-500">Est. Value</p><p className="text-green-600 font-semibold">${selected.estimated_value.toLocaleString()}</p></div>}
                  {selected.list_price > 0 && <div><p className="text-xs text-slate-500">List Price</p><p>${selected.list_price.toLocaleString()}</p></div>}
                  {selected.equity_estimate > 0 && <div><p className="text-xs text-slate-500">Est. Equity</p><p className="text-purple-600 font-semibold">${selected.equity_estimate.toLocaleString()}</p></div>}
                  {selected.estimated_ltv > 0 && <div><p className="text-xs text-slate-500">Loan-to-Value</p><p>{(selected.estimated_ltv).toFixed(1)}%</p></div>}
                  {selected.mortgage_balance > 0 && <div><p className="text-xs text-slate-500">Mortgage Balance</p><p>${selected.mortgage_balance.toLocaleString()}</p></div>}
                  {selected.total_open_loans > 0 && <div><p className="text-xs text-slate-500">Open Loans</p><p>{selected.total_open_loans}</p></div>}
                </div>
              </div>

              {/* Sales History */}
              {(selected.last_sale_date || selected.last_sale_amount > 0 || selected.mls_status) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Sales History</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.last_sale_date && <div><p className="text-xs text-slate-500">Last Sale Date</p><p>{new Date(selected.last_sale_date).toLocaleDateString()}</p></div>}
                    {selected.last_sale_recording_date && <div><p className="text-xs text-slate-500">Recording Date</p><p>{new Date(selected.last_sale_recording_date).toLocaleDateString()}</p></div>}
                    {selected.last_sale_amount > 0 && <div><p className="text-xs text-slate-500">Last Sale Amount</p><p>${selected.last_sale_amount.toLocaleString()}</p></div>}
                    {selected.mls_status && <div><p className="text-xs text-slate-500">MLS Status</p><p className="capitalize">{selected.mls_status}</p></div>}
                    {selected.list_date && <div><p className="text-xs text-slate-500">MLS Date</p><p>{new Date(selected.list_date).toLocaleDateString()}</p></div>}
                  </div>
                </div>
              )}

              {/* Indicators */}
              <div className="space-y-2 border-t pt-3">
                <p className="font-semibold text-sm">Life Event Indicators</p>
                <div className="flex flex-wrap gap-2">
                  {selected.probate_indicator && <Badge className="bg-red-100 text-red-700">Probate</Badge>}
                  {selected.inherited_indicator && <Badge className="bg-orange-100 text-orange-700">Inherited</Badge>}
                  {selected.absentee_owner && <Badge className="bg-amber-100 text-amber-700">Absentee Owner</Badge>}
                  {selected.vacant && <Badge className="bg-yellow-100 text-yellow-700">Vacant</Badge>}
                  {selected.senior_owner_indicator && <Badge className="bg-blue-100 text-blue-700">Senior Owner</Badge>}
                  {selected.deceased_owner && <Badge className="bg-slate-100 text-slate-700">Deceased Owner</Badge>}
                  {selected.divorce_indicator && <Badge className="bg-pink-100 text-pink-700">Divorce</Badge>}
                  {selected.preforeclosure_indicator && <Badge className="bg-red-100 text-red-700">Pre-Foreclosure</Badge>}
                  {selected.foreclosure_indicator && <Badge className="bg-red-200 text-red-800">Foreclosure</Badge>}
                  {selected.lien_indicator && <Badge className="bg-orange-100 text-orange-700">Lien</Badge>}
                  {selected.tax_delinquent_indicator && <Badge className="bg-red-100 text-red-700">Tax Delinquent</Badge>}
                  {!selected.probate_indicator && !selected.inherited_indicator && !selected.absentee_owner && !selected.vacant && !selected.senior_owner_indicator && !selected.deceased_owner && !selected.divorce_indicator && !selected.preforeclosure_indicator && !selected.foreclosure_indicator && !selected.lien_indicator && !selected.tax_delinquent_indicator && <span className="text-slate-400 text-sm">No indicators</span>}
                </div>
              </div>

              {/* Lien / Pre-FC Details */}
              {(selected.lien_date || selected.lien_amount > 0 || selected.prefc_doc_number || selected.prefc_unpaid_balance > 0 || selected.prefc_auction_date) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Lien & Pre-Foreclosure</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.lien_date && <div><p className="text-xs text-slate-500">Lien Date</p><p>{new Date(selected.lien_date).toLocaleDateString()}</p></div>}
                    {selected.lien_amount > 0 && <div><p className="text-xs text-slate-500">Lien Amount</p><p>${selected.lien_amount.toLocaleString()}</p></div>}
                    {selected.prefc_doc_number && <div><p className="text-xs text-slate-500">Pre-FC Doc #</p><p>{selected.prefc_doc_number}</p></div>}
                    {selected.prefc_unpaid_balance > 0 && <div><p className="text-xs text-slate-500">Pre-FC Unpaid Balance</p><p>${selected.prefc_unpaid_balance.toLocaleString()}</p></div>}
                    {selected.prefc_auction_date && <div><p className="text-xs text-slate-500">Pre-FC Auction Date</p><p>{new Date(selected.prefc_auction_date).toLocaleDateString()}</p></div>}
                  </div>
                </div>
              )}

              {/* Listing Agent */}
              {(selected.listing_agent_name || selected.listing_agent_email || selected.listing_agent_phone || selected.listing_brokerage) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Listing Agent</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.listing_agent_name && <div><p className="text-xs text-slate-500">Agent Name</p><p>{selected.listing_agent_name}</p></div>}
                    {selected.listing_agent_email && <div><p className="text-xs text-slate-500">Agent Email</p><a href={`mailto:${selected.listing_agent_email}`} className="text-cyan-600 hover:underline">{selected.listing_agent_email}</a></div>}
                    {selected.listing_agent_phone && <div><p className="text-xs text-slate-500">Agent Phone</p><a href={`tel:${selected.listing_agent_phone}`} className="text-cyan-600 hover:underline">{selected.listing_agent_phone}</a></div>}
                    {selected.listing_brokerage && <div><p className="text-xs text-slate-500">Brokerage</p><p>{selected.listing_brokerage}</p></div>}
                  </div>
                </div>
              )}

              {/* Marketing */}
              {(selected.marketing_lists || selected.skip_traces || selected.date_added_to_list || selected.method_of_add) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Marketing Activity</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.marketing_lists && <div><p className="text-xs text-slate-500">Marketing Lists</p><p>{selected.marketing_lists}</p></div>}
                    {selected.skip_traces && <div><p className="text-xs text-slate-500">Skip Traces</p><p>{selected.skip_traces}</p></div>}
                    {selected.date_added_to_list && <div><p className="text-xs text-slate-500">Date Added</p><p>{selected.date_added_to_list}</p></div>}
                    {selected.method_of_add && <div><p className="text-xs text-slate-500">Method</p><p>{selected.method_of_add}</p></div>}
                  </div>
                </div>
              )}

              {/* Listing Remarks */}
              {selected.listing_remarks && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Listing Remarks</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{selected.listing_remarks}</p>
                </div>
              )}

              {/* Score Reasons */}
              {selected.score_reasons?.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold text-sm">Score Reasons</p>
                  <ul className="text-sm text-slate-600 list-disc list-inside">
                    {selected.score_reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm border-t pt-3">
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-slate-600">{selected.notes}</p>
                </div>
              )}

              {/* Assignment */}
              {!selected.assigned_operator_id ? (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-1">Assign to Operator</p>
                  <Select onValueChange={(opId) => handleAssign(selected.id, opId)}>
                    <SelectTrigger><SelectValue placeholder="Select operator..." /></SelectTrigger>
                    <SelectContent>{operators.map(op => <SelectItem key={op.id} value={op.id}>{op.company_name || op.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-1">Update Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['sent_to_operator', 'operator_accepted', 'operator_declined', 'contacted_agent'].map(s => (
                      <Button key={s} size="sm" variant={selected.operator_status === s ? 'default' : 'outline'}
                        onClick={() => handleStatusUpdate(selected.id, 'operator_status', s)}
                        className="text-xs capitalize">
                        {s.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t text-xs text-slate-500">
                <Clock className="w-3 h-3" />Imported: {new Date(selected.created_date).toLocaleDateString()}
                {selected.import_batch_id && <span className="ml-auto text-slate-400">Batch: {selected.import_batch_id.slice(-6)}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}