import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Eye,
  Edit,
  MessageSquare,
  UserCheck,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { isAdminUser } from '@/lib/isAdminUser';

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700 border-blue-300',
  contacted: 'bg-purple-100 text-purple-700 border-purple-300',
  qualified: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  partnership_requested: 'bg-amber-100 text-amber-700 border-amber-300',
  partnership_active: 'bg-green-100 text-green-700 border-green-300',
  not_interested: 'bg-red-100 text-red-700 border-red-300',
  archived: 'bg-slate-100 text-slate-600 border-slate-300',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function PropstreamAgentLeads() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [extractingAgents, setExtractingAgents] = useState(false);
  const [backfillingData, setBackfillingData] = useState(false);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [listingStats, setListingStats] = useState(null);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalBatches, setTotalBatches] = useState(null);
  const continueRef = React.useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [agentFilter, setAgentFilter] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (_) {}
    })();
    
    // Read agent filter from URL parameter
    const params = new URLSearchParams(window.location.search);
    const agentParam = params.get('agent');
    if (agentParam) {
      setAgentFilter(agentParam);
      setSearchTerm(agentParam);
    }
  }, []);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['propstream-agent-leads'],
    queryFn: () => base44.entities.PropstreamAgentLead.list('-created_date', 10000),
    initialData: [],
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PropstreamAgentLead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propstream-agent-leads'] });
      setDetailModalOpen(false);
      setNotesModalOpen(false);
    },
  });

  const handleStatusChange = (lead, newStatus) => {
    updateLeadMutation.mutate({
      id: lead.id,
      data: { ...lead, lead_status: newStatus },
    });
  };

  const handlePriorityChange = (lead, newPriority) => {
    updateLeadMutation.mutate({
      id: lead.id,
      data: { ...lead, priority: newPriority },
    });
  };

  const handleSaveNotes = () => {
    if (selectedLead && notes.trim()) {
      updateLeadMutation.mutate({
        id: selectedLead.id,
        data: {
          ...selectedLead,
          notes: notes.trim(),
          last_updated_date: new Date().toISOString(),
        },
      });
    }
  };

  const openDetailModal = (lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setDetailModalOpen(true);
  };

  const openNotesModal = (lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setNotesModalOpen(true);
  };

  const handleOpenExtractDialog = async () => {
    setFetchingStats(true);
    try {
      // Fetch listing count from PropstreamREListing
      const listings = await base44.entities.PropstreamREListing.list();
      const totalListings = listings.length;
      
      // Estimate unique agents (typically 1 agent per 3-5 listings)
      const estimatedAgents = Math.ceil(totalListings / 4);
      
      setListingStats({
        totalListings,
        estimatedAgents,
        estimatedRange: {
          min: Math.ceil(totalListings / 5),
          max: Math.ceil(totalListings / 3)
        },
        totalBatches: Math.ceil(estimatedAgents / 100)
      });
      setExtractDialogOpen(true);
    } catch (error) {
      alert('Error fetching listing stats: ' + error.message);
    } finally {
      setFetchingStats(false);
    }
  };

  const processBatch = async (batchNum, totals) => {
    console.log(`[Extraction] Processing batch ${batchNum}...`, { totals });
    setExtractionProgress({
      currentBatch: batchNum,
      ...totals,
      status: 'processing'
    });
    
    try {
      const result = await base44.functions.invoke('extractAgentLeadsFromPropstream', {
        batch_number: batchNum,
        batch_size: 100
      });
      
      console.log(`[Extraction] Batch ${batchNum} result:`, result);
      
      if (!result) {
        throw new Error('Backend function returned no result');
      }
      
      return {
        totalCreated: totals.totalCreated + (result.agents_created || 0),
        totalUpdated: totals.totalUpdated + (result.agents_updated || 0),
        totalProcessed: totals.totalProcessed + (result.total_listings_processed || 0),
        hasMore: result.has_more_batches === true,
        totalBatches: result.total_batches || batchNum
      };
    } catch (error) {
      console.error(`[Extraction] Batch ${batchNum} failed:`, error);
      throw error;
    }
  };

  const handleConfirmExtract = async () => {
    console.log('[Extraction] Starting extraction process...');
    setExtractingAgents(true);
    setCurrentBatch(1);
    
    try {
      let totals = { totalCreated: 0, totalUpdated: 0, totalProcessed: 0 };
      let batchNum = 1;
      let hasMore = true;
      
      while (hasMore) {
        const result = await processBatch(batchNum, totals);
        totals = { totalCreated: result.totalCreated, totalUpdated: result.totalUpdated, totalProcessed: result.totalProcessed };
        
        console.log(`[Extraction] Batch ${batchNum} completed. hasMore:`, result.hasMore);
        
        if (!result.hasMore) {
          hasMore = false;
          console.log('[Extraction] All batches complete!', totals);
          setExtractionProgress({
            currentBatch: batchNum,
            ...totals,
            status: 'complete',
            totalBatches: batchNum
          });
        } else {
          console.log(`[Extraction] Waiting for user to continue to batch ${batchNum + 1}`);
          setTotalBatches(result.totalBatches);
          setCurrentBatch(batchNum + 1);
          setExtractionProgress({
            currentBatch: batchNum,
            ...totals,
            status: 'waiting',
            totalBatches: result.totalBatches
          });
          // Wait for user to click Continue - the Continue button will call continueExtraction
          return; // Exit and wait for user input
        }
        
        batchNum++;
      }
      
      // Extraction complete - modal will show complete status, user closes manually
      console.log('[Extraction] Extraction finished, invalidating query...');
      queryClient.invalidateQueries({ queryKey: ['propstream-agent-leads'] });
      setExtractingAgents(false);
      setListingStats(null);
    } catch (error) {
      console.error('[Extraction] Fatal error:', error);
      alert('Error during extraction: ' + error.message);
      setExtractingAgents(false);
      setExtractionProgress(null);
      setListingStats(null);
    }
  };

  const continueExtraction = async () => {
    console.log('[Extraction] Continue clicked. Current state:', { extractionProgress, currentBatch });
    if (!extractionProgress) {
      console.error('[Extraction] No extraction progress state found!');
      return;
    }
    
    try {
      let totals = { 
        totalCreated: extractionProgress.totalCreated, 
        totalUpdated: extractionProgress.totalUpdated, 
        totalProcessed: extractionProgress.totalProcessed 
      };
      let batchNum = currentBatch;
      let hasMore = true;
      
      console.log(`[Extraction] Resuming from batch ${batchNum}`);
      
      while (hasMore) {
        const result = await processBatch(batchNum, totals);
        totals = { totalCreated: result.totalCreated, totalUpdated: result.totalUpdated, totalProcessed: result.totalProcessed };
        
        console.log(`[Extraction] Batch ${batchNum} completed. hasMore:`, result.hasMore);
        
        if (!result.hasMore) {
          hasMore = false;
          console.log('[Extraction] All batches complete!', totals);
          setExtractionProgress({
            currentBatch: batchNum,
            ...totals,
            status: 'complete',
            totalBatches: batchNum
          });
        } else {
          console.log(`[Extraction] Waiting for user to continue to batch ${batchNum + 1}`);
          setTotalBatches(result.totalBatches);
          setCurrentBatch(batchNum + 1);
          setExtractionProgress({
            currentBatch: batchNum,
            ...totals,
            status: 'waiting',
            totalBatches: result.totalBatches
          });
          return; // Wait for next continue
        }
        
        batchNum++;
      }
      
      // Extraction complete - modal shows complete status, user closes manually
      console.log('[Extraction] Extraction finished, invalidating query...');
      queryClient.invalidateQueries({ queryKey: ['propstream-agent-leads'] });
      setExtractingAgents(false);
      setListingStats(null);
    } catch (error) {
      console.error('[Extraction] Fatal error in continueExtraction:', error);
      alert('Error during extraction: ' + error.message);
      setExtractingAgents(false);
      setExtractionProgress(null);
      setListingStats(null);
    }
  };

  const handleBackfillTerritoryData = async () => {
    setBackfillingData(true);
    try {
      const result = await base44.functions.invoke('backfillAgentTerritoryData');
      queryClient.invalidateQueries({ queryKey: ['propstream-agent-leads'] });
      alert(`Territory data backfilled successfully!\n\n${result.updated_count} agents updated with territory/state data\nTotal agents processed: ${result.total_agents}`);
    } catch (error) {
      alert('Error backfilling territory data: ' + error.message);
    } finally {
      setBackfillingData(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.agent_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.brokerage_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesState = stateFilter === 'all' || lead.brokerage_state === stateFilter;
    const matchesTerritory = territoryFilter === 'all' || !lead.territory_name || lead.territory_name === territoryFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesState && matchesTerritory;
  });

  const uniqueStates = [...new Set(leads.map(l => l.brokerage_state).filter(Boolean))].sort();
  const uniqueTerritories = [...new Set(leads.map(l => l.territory_name).filter(Boolean))].sort();

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.lead_status === 'new').length,
    contacted: leads.filter(l => l.lead_status === 'contacted').length,
    partnership_active: leads.filter(l => l.lead_status === 'partnership_active').length,
    high_priority: leads.filter(l => l.priority === 'high' || l.priority === 'urgent').length,
  };

  if (!user || !isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 font-serif">PropStream Agent Leads</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage real estate agent partnerships from MLS listings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 text-blue-600 hover:text-blue-700" 
              onClick={handleOpenExtractDialog}
              disabled={extractingAgents || fetchingStats}
            >
              {(extractingAgents || fetchingStats) ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Extract from PropStream
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 text-green-600 hover:text-green-700" 
              onClick={handleBackfillTerritoryData}
              disabled={backfillingData}
            >
              {backfillingData ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              Backfill Territory Data
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['propstream-agent-leads'] })}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">New Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.new}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.contacted}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Active Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.partnership_active}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.high_priority}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-64">
                <Label className="text-sm font-medium text-slate-700 mb-2">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by agent name, email, or brokerage..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium text-slate-700 mb-2">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="partnership_requested">Partnership Requested</SelectItem>
                    <SelectItem value="partnership_active">Active Partner</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium text-slate-700 mb-2">Priority</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium text-slate-700 mb-2">State</Label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium text-slate-700 mb-2">Territory</Label>
                <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Territories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Territories</SelectItem>
                    {uniqueTerritories.map(territory => (
                      <SelectItem key={territory} value={territory}>{territory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Agent Leads ({filteredLeads.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-slate-600">Rows per page:</Label>
                <Select value={rowsPerPage.toString()} onValueChange={(value) => { setRowsPerPage(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p>Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No agent leads found. Import properties from PropStream to populate.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Agent</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Brokerage</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">State</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Territory</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Listings</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priority</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-slate-800">{lead.agent_name}</div>
                            {lead.agent_email && (
                              <div className="text-xs text-slate-500">{lead.agent_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">{lead.brokerage_name || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700 font-medium">{lead.brokerage_state || lead.state || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">{lead.territory_name || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">{lead.listing_count || 1}</div>
                          <div className="text-xs text-slate-500">
                            ${lead.total_volume?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${STATUS_COLORS[lead.lead_status]}`}>
                            {lead.lead_status?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${PRIORITY_COLORS[lead.priority]}`}>
                            {lead.priority}
                          </Badge>
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetailModal(lead)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openNotesModal(lead)}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {filteredLeads.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-600">Page</span>
                    <span className="text-sm font-medium text-slate-800">{currentPage}</span>
                    <span className="text-sm text-slate-600">of {totalPages}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {selectedLead.agent_name}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {selectedLead.brokerage_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Email</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{selectedLead.agent_email || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Phone</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{selectedLead.agent_phone || '—'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700">Brokerage Name</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{selectedLead.brokerage_name || '—'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Listing Count</Label>
                    <div className="text-lg font-semibold text-slate-800 mt-1">
                      {selectedLead.listing_count || 1}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Total Volume</Label>
                    <div className="text-lg font-semibold text-slate-800 mt-1">
                      ${selectedLead.total_volume?.toLocaleString() || 0}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Status</Label>
                    <Select
                      value={selectedLead.lead_status}
                      onValueChange={(value) => handleStatusChange(selectedLead, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="partnership_requested">Partnership Requested</SelectItem>
                        <SelectItem value="partnership_active">Active Partner</SelectItem>
                        <SelectItem value="not_interested">Not Interested</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Priority</Label>
                    <Select
                      value={selectedLead.priority}
                      onValueChange={(value) => handlePriorityChange(selectedLead, value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedLead.property_addresses && selectedLead.property_addresses.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Property Addresses</Label>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {selectedLead.property_addresses.map((addr, idx) => (
                        <div key={idx} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                          {addr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-slate-700">Notes</Label>
                  <Textarea
                    value={selectedLead.notes || ''}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                    rows={4}
                    placeholder="Add notes about this agent..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveNotes}
                >
                  Save Notes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Extract Dialog */}
      <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Extract Agent Leads
            </DialogTitle>
            <DialogDescription>
              {extractionProgress ? 'Monitor extraction progress' : 'Review the estimated extraction results before proceeding'}
            </DialogDescription>
          </DialogHeader>

          {fetchingStats ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
              <p className="text-slate-600">Analyzing PropStream database...</p>
            </div>
          ) : extractionProgress ? (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <RefreshCw className={`w-5 h-5 text-blue-600 ${extractionProgress.status === 'processing' ? 'animate-spin' : ''}`} />
                  <h3 className="font-semibold text-blue-800">
                    {extractionProgress.status === 'processing' && `Processing Batch ${extractionProgress.currentBatch}...`}
                    {extractionProgress.status === 'waiting' && `Batch ${extractionProgress.currentBatch} Complete!`}
                    {extractionProgress.status === 'complete' && 'Extraction Complete!'}
                  </h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Agents Created:</span>
                    <span className="font-semibold">{extractionProgress.totalCreated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Agents Updated:</span>
                    <span className="font-semibold">{extractionProgress.totalUpdated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Listings Processed:</span>
                    <span className="font-semibold">{extractionProgress.totalProcessed}</span>
                  </div>
                  {extractionProgress.totalBatches && (
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-slate-600">Progress:</span>
                      <span className="font-semibold">{extractionProgress.currentBatch} of {extractionProgress.totalBatches} batches</span>
                    </div>
                  )}
                </div>
              </div>

              {extractionProgress.status === 'waiting' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-sm text-amber-800">
                    <strong>Ready for next batch?</strong> Click Continue to process batch {currentBatch} of {totalBatches}.
                  </div>
                </div>
              )}
            </div>
          ) : listingStats ? (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">Source Database</h3>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {listingStats.totalListings.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 mt-1">Total RE Listings in PropStream</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-slate-800">Estimated Unique Agents</h3>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {listingStats.estimatedAgents.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Estimated range: {listingStats.estimatedRange.min.toLocaleString()} - {listingStats.estimatedRange.max.toLocaleString()} agents
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Based on typical ratio of 1 agent per 3-5 listings
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800">
                    <strong>Batch Processing:</strong> Agents will be extracted in batches of 100. You'll be prompted to continue after each batch.
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="text-xs text-purple-800">
                    <strong>Total Batches:</strong> {listingStats.totalBatches} batches of 100 agents each
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {extractionProgress ? (
              extractionProgress.status === 'waiting' ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setExtractDialogOpen(false);
                      setExtractionProgress(null);
                      setExtractingAgents(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={continueExtraction}
                  >
                    Continue to Batch {currentBatch}
                  </Button>
                </>
              ) : extractionProgress.status === 'complete' ? (
                <Button onClick={() => setExtractDialogOpen(false)}>
                  Close
                </Button>
              ) : (
                <Button disabled>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </Button>
              )
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setExtractDialogOpen(false)}
                  disabled={extractingAgents}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirmExtract}
                  disabled={extractingAgents || !listingStats}
                >
                  {extractingAgents ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Start Extraction
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Modal (Quick Edit) */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Notes</DialogTitle>
            <DialogDescription>
              {selectedLead?.agent_name} - {selectedLead?.brokerage_name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[200px]"
            placeholder="Add or update notes..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}