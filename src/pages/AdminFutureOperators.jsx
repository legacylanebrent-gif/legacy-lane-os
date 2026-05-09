import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Phone, Globe, MapPin, Calendar, Package,
  Facebook, Twitter, Instagram, Youtube, ExternalLink, Filter, Download,
  Mail, Loader2, CheckCircle2, Pencil, Save, X, Trash2
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminFutureOperators() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('AR');
  const [packageFilter, setPackageFilter] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState('idle');
  const [importResults, setImportResults] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [stateCount, setStateCount] = useState(null);
  const [enrichingIds, setEnrichingIds] = useState(new Set());
  const [deduplicating, setDeduplicating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { done, total }
  const [editingOperator, setEditingOperator] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [selectedScrapeStates, setSelectedScrapeStates] = useState([]);
  const [scrapeQueue, setScrapeQueue] = useState([]); // [{state, status: 'pending'|'running'|'done'|'error', result}]
  const [scrapeRunning, setScrapeRunning] = useState(false);
  const scrapeAbortRef = useRef(false);

  const decodeHtml = (str) => str ? str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'") : '';

  const openEdit = (operator) => {
    setEditingOperator(operator);
    setEditForm({
      company_name: decodeHtml(operator.company_name || ''),
      email: operator.email || '',
      phone: operator.phone || '',
      website: operator.website || '',
      website_url: operator.website_url || '',
      city: operator.city || '',
      state: operator.state || '',
      zip_code: operator.zip_code || '',
      county: operator.county || '',
      facebook: operator.facebook || '',
      instagram: operator.instagram || '',
      twitter: operator.twitter || '',
      youtube: operator.youtube || '',
      enrichment_notes: operator.enrichment_notes || '',
      alternate_emails_text: (operator.alternate_emails || []).join(', '),
      do_not_contact: operator.do_not_contact || false,
      unsubscribe_status: operator.unsubscribe_status || false,
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const saveData = { ...editForm };
      saveData.alternate_emails = editForm.alternate_emails_text
        ? editForm.alternate_emails_text.split(',').map(e => e.trim()).filter(Boolean).slice(0, 5)
        : [];
      delete saveData.alternate_emails_text;
      await base44.entities.FutureEstateOperator.update(editingOperator.id, saveData);
      setOperators(prev => prev.map(op => op.id === editingOperator.id ? { ...op, ...editForm } : op));
      setEditingOperator(null);
    } catch (e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFindEmail = async (operatorId) => {
    setEnrichingIds(prev => new Set([...prev, operatorId]));
    try {
      await base44.functions.invoke('enrichCompanyEmail', { company_id: operatorId });
      await loadOperators();
    } catch (e) {
      alert('Error finding email: ' + e.message);
    } finally {
      setEnrichingIds(prev => { const n = new Set(prev); n.delete(operatorId); return n; });
    }
  };

  const handleDeduplicate = async () => {
    if (!confirm(`This will scan ${stateFilter} records and delete duplicates based on phone number, keeping the most complete record. Continue?`)) return;
    setDeduplicating(true);
    try {
      const res = await base44.functions.invoke('deduplicateFutureOperators', { state: stateFilter });
      const { total_scanned, duplicates_deleted, remaining } = res.data;
      alert(`Done! Scanned ${total_scanned.toLocaleString()} ${stateFilter} records, deleted ${duplicates_deleted.toLocaleString()} duplicates. ${remaining.toLocaleString()} remain.`);
      await loadTotalCount();
      await loadStateCount();
      await loadOperators();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setDeduplicating(false);
    }
  };

  const handleBatchFindEmails = async () => {
    const targets = filteredOperators.filter(op => !op.email && !op.do_not_contact);
    if (targets.length === 0) return alert('All visible companies already have emails or are marked do-not-contact.');
    if (!confirm(`Run email finder on ${targets.length} companies in ${stateFilter}? This may take a while.`)) return;

    setBatchRunning(true);
    setBatchProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      try {
        await base44.functions.invoke('enrichCompanyEmail', { company_id: targets[i].id });
      } catch (e) {
        // continue on individual errors
      }
      setBatchProgress({ done: i + 1, total: targets.length });
    }

    setBatchRunning(false);
    setBatchProgress(null);
    await loadOperators();
  };

  useEffect(() => {
    loadOperators();
    loadStateCount();
  }, [stateFilter]);

  useEffect(() => {
    loadTotalCount();
  }, []);

  const loadTotalCount = async () => {
    try {
      const res = await base44.functions.invoke('getFutureOperatorCount', {});
      setTotalCount(res.data.total || 0);
    } catch (error) {
      console.error('Error loading total count:', error);
    }
  };

  const loadStateCount = async () => {
    setStateCount(null);
    try {
      const res = await base44.functions.invoke('getFutureOperatorCount', { state: stateFilter });
      setStateCount(res.data.total || 0);
    } catch (error) {
      console.error('Error loading state count:', error);
    }
  };

  const loadOperators = async () => {
    setLoading(true);
    try {
      // Filter by state on the server
      const data = await base44.entities.FutureEstateOperator.filter(
        { state: stateFilter },
        '-created_date',
        1000
      );
      setOperators(data);
    } catch (error) {
      console.error('Error loading operators:', error);
    } finally {
      setLoading(false);
    }
  };

  const allStates = ['AK', 'AL', 'AR', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'];

  const filteredOperators = operators.filter(op => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      op.company_name?.toLowerCase().includes(query) ||
      op.city?.toLowerCase().includes(query) ||
      op.state?.toLowerCase().includes(query) ||
      op.phone?.toLowerCase().includes(query)
    );
    const matchesPackage = packageFilter === 'all' || op.package_type === packageFilter;
    
    return matchesSearch && matchesPackage;
  });

  const uniquePackages = [...new Set(operators.map(op => op.package_type).filter(Boolean))].sort();

  const getPackageColor = (packageType) => {
    const colors = {
      'Gold': 'bg-yellow-100 text-yellow-800',
      'Silver': 'bg-slate-100 text-slate-700',
      'Bronze': 'bg-orange-100 text-orange-700',
      'Platinum': 'bg-purple-100 text-purple-800'
    };
    return colors[packageType] || 'bg-slate-100 text-slate-700';
  };

  const handleUpdateState = () => {
    // Pre-select the currently viewed state
    setSelectedScrapeStates([stateFilter]);
    setScrapeQueue([]);
    setScrapeRunning(false);
    scrapeAbortRef.current = false;
    setShowScrapeModal(true);
  };

  const toggleScrapeState = (state) => {
    setSelectedScrapeStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const handleStartScrape = async () => {
    const ordered = allStates.filter(s => selectedScrapeStates.includes(s));
    const queue = ordered.map(s => ({ state: s, status: 'pending', result: null }));
    setScrapeQueue(queue);
    setScrapeRunning(true);
    scrapeAbortRef.current = false;

    for (let i = 0; i < ordered.length; i++) {
      if (scrapeAbortRef.current) break;
      const state = ordered[i];

      setScrapeQueue(prev => prev.map(q => q.state === state ? { ...q, status: 'running' } : q));

      try {
        // Use the dedicated per-state scrape function: e.g. scrapeNJOperators
        const fnName = `scrape${state.charAt(0) + state.slice(1).toLowerCase()}Operators`;
        // Build the function name: scrapeNJOperators → scrape + NJ → scrapeNJOperators
        const stateFnName = `scrape${state}Operators`;
        const res = await base44.functions.invoke(stateFnName, {});
        setScrapeQueue(prev => prev.map(q => q.state === state ? { ...q, status: 'done', result: res.data } : q));
      } catch (err) {
        setScrapeQueue(prev => prev.map(q => q.state === state ? { ...q, status: 'error', result: { error: err.message } } : q));
      }
    }

    setScrapeRunning(false);
    await loadTotalCount();
    await loadStateCount();
    await loadOperators();
  };

  const handleStopScrape = () => {
    scrapeAbortRef.current = true;
    setScrapeRunning(false);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportStatus('idle');
    setImportResults(null);
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
    <div className="p-6 lg:p-8 pt-4 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-2">
            US Estate Sale Companies
          </h1>
          <p className="text-slate-600">
            US estate sale companies sourced from current competitors
          </p>
        </div>
        <div className="text-left sm:text-right space-y-1">
          <div>
            <div className="text-3xl font-bold text-slate-900">{totalCount > 0 ? totalCount.toLocaleString() : '...'}</div>
            <div className="text-sm text-slate-600">Total Records in Database</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-orange-600">{stateCount !== null ? stateCount.toLocaleString() : '...'}</div>
            <div className="text-sm text-slate-500">{stateFilter} Records</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by company, city, state, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="outline" className="text-sm w-fit">
                {filteredOperators.length} results
              </Badge>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {allStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={packageFilter} onValueChange={setPackageFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="All Packages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packages</SelectItem>
                    {uniquePackages.map(pkg => (
                      <SelectItem key={pkg} value={pkg}>{pkg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleBatchFindEmails}
                disabled={batchRunning || updating}
                className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
              >
                {batchRunning
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{batchProgress?.done}/{batchProgress?.total}</>
                  : <><Mail className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Batch Find Emails ({stateFilter})</span><span className="sm:hidden">Batch Emails</span></>
                }
              </Button>

              <Button
                onClick={handleDeduplicate}
                disabled={deduplicating || updating || batchRunning}
                variant="outline"
                className="border-red-400 text-red-700 hover:bg-red-50 whitespace-nowrap"
              >
                {deduplicating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deduplicating...</>
                  : <><Trash2 className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Remove Duplicates</span><span className="sm:hidden">Dedupe</span></>
                }
              </Button>

              <Button 
                onClick={handleUpdateState}
                disabled={batchRunning || deduplicating || scrapeRunning}
                className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Scrape States</span>
                <span className="sm:hidden">Scrape</span>
              </Button>
              
              {packageFilter !== 'all' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setPackageFilter('all');
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOperators.map((operator) => (
              <Card key={operator.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                            {operator.company_name?.replace(/&amp;/g, '&')}
                          </h3>
                          {operator.package_type && (
                            <Badge className={getPackageColor(operator.package_type)}>
                              {operator.package_type}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(operator)}
                          className="border-slate-400 text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFindEmail(operator.id)}
                          disabled={enrichingIds.has(operator.id) || operator.do_not_contact}
                          className="border-orange-400 text-orange-700 hover:bg-orange-50"
                        >
                          {enrichingIds.has(operator.id)
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Finding...</>
                            : operator.email
                              ? <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />Re-check</>
                              : <><Mail className="w-3 h-3 mr-1" />Find Email</>
                          }
                        </Button>
                        {operator.source_url && (
                          <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                            <a href={operator.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">View Profile</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
                      {operator.city && operator.state && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                          <span className="truncate">{operator.city}, {operator.state} {operator.zip_code}</span>
                        </div>
                      )}
                      
                      {operator.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <a href={`tel:${operator.phone}`} className="hover:underline truncate">
                            {operator.phone}
                          </a>
                        </div>
                      )}
                      
                      {operator.website && (
                        <div className="flex items-center gap-2 col-span-full">
                          <Globe className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <a 
                            href={operator.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline truncate"
                          >
                            {operator.website.replace(/https?:\/\/(www\.)?/, '')}
                          </a>
                        </div>
                      )}
                      
                      {operator.member_since && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span className="truncate">Member since {operator.member_since}</span>
                        </div>
                      )}

                      {operator.email && (
                        <div className="col-span-full space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <a href={`mailto:${operator.email}`} className="hover:underline truncate font-mono text-sm font-medium">
                              {operator.email}
                            </a>
                            <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0 flex-shrink-0">Primary</Badge>
                            {operator.email_confidence_score != null && (
                              <span className="text-xs text-slate-400">({operator.email_confidence_score}%)</span>
                            )}
                          </div>
                          {operator.alternate_emails?.length > 0 && operator.alternate_emails.map((altEmail, idx) => (
                            <div key={idx} className="flex items-center gap-2 pl-6">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <a href={`mailto:${altEmail}`} className="hover:underline truncate font-mono text-xs text-slate-600">
                                {altEmail}
                              </a>
                              <Badge variant="outline" className="text-xs px-1.5 py-0 flex-shrink-0 text-slate-500">Alt {idx + 1}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {(operator.facebook || operator.twitter || operator.instagram || operator.youtube || operator.pinterest) && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {operator.facebook && (
                          <a 
                            href={operator.facebook} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        )}
                        {operator.twitter && (
                          <a 
                            href={operator.twitter} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sky-500 hover:text-sky-600"
                          >
                            <Twitter className="w-4 h-4" />
                          </a>
                        )}
                        {operator.instagram && (
                          <a 
                            href={operator.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-pink-600 hover:text-pink-700"
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        )}
                        {operator.youtube && (
                          <a 
                            href={operator.youtube} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Youtube className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Operator Modal */}
      <Dialog open={!!editingOperator} onOpenChange={(open) => !open && setEditingOperator(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company Profile</DialogTitle>
            <DialogDescription>{decodeHtml(editingOperator?.company_name || '')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Company Name</Label>
                <Input value={editForm.company_name} onChange={e => setEditForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Emails</Label>
                {/* Primary email row */}
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <Input
                    value={editForm.email}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    type="email"
                    className="flex-1 h-8 text-sm"
                    placeholder="Primary email..."
                  />
                  <Badge className="bg-green-100 text-green-700 text-xs flex-shrink-0">Primary</Badge>
                  <button
                    type="button"
                    onClick={() => setEditForm(p => ({ ...p, email: '' }))}
                    className="text-xs text-red-600 hover:text-red-800 flex-shrink-0 whitespace-nowrap underline"
                  >
                    Delete
                  </button>
                </div>
                {/* Alternate email rows */}
                {(editForm.alternate_emails_text ? editForm.alternate_emails_text.split(',').map(e => e.trim()).filter(Boolean) : []).map((altEmail, idx) => (
                  <div key={`${altEmail}-${idx}`} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                    <Input
                      value={altEmail}
                      onChange={e => {
                        const parts = editForm.alternate_emails_text.split(',').map(x => x.trim()).filter(Boolean);
                        parts[idx] = e.target.value;
                        setEditForm(p => ({ ...p, alternate_emails_text: parts.join(', ') }));
                      }}
                      type="email"
                      className="flex-1 h-8 text-sm"
                    />
                    <Badge variant="outline" className="text-xs flex-shrink-0">Alt {idx + 1}</Badge>
                    <button
                      type="button"
                      onClick={() => {
                        const parts = editForm.alternate_emails_text.split(',').map(x => x.trim()).filter(Boolean);
                        const newPrimary = parts[idx];
                        const oldPrimary = editForm.email;
                        parts[idx] = oldPrimary;
                        setEditForm(p => ({ ...p, email: newPrimary, alternate_emails_text: parts.filter(Boolean).join(', ') }));
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 whitespace-nowrap underline"
                    >
                      Make Default
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const parts = editForm.alternate_emails_text.split(',').map(x => x.trim()).filter(Boolean);
                        const newParts = parts.filter((_, i) => i !== idx);
                        setEditForm(p => ({ ...p, alternate_emails_text: newParts.join(', ') }));
                      }}
                      className="text-xs text-red-600 hover:text-red-800 flex-shrink-0 whitespace-nowrap underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-400">To add more alternates, type them comma-separated: <span className="font-mono">alt1@co.com, alt2@co.com</span></p>
                <Input
                  placeholder="Add alternate emails (comma-separated)..."
                  onBlur={e => {
                    if (!e.target.value.trim()) return;
                    const existing = editForm.alternate_emails_text ? editForm.alternate_emails_text.split(',').map(x => x.trim()).filter(Boolean) : [];
                    const newOnes = e.target.value.split(',').map(x => x.trim()).filter(Boolean);
                    setEditForm(p => ({ ...p, alternate_emails_text: [...existing, ...newOnes].join(', ') }));
                    e.target.value = '';
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Website</Label>
                <Input value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>City</Label>
                <Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} maxLength={2} />
              </div>
              <div>
                <Label>ZIP Code</Label>
                <Input value={editForm.zip_code} onChange={e => setEditForm(p => ({ ...p, zip_code: e.target.value }))} />
              </div>
              <div>
                <Label>County</Label>
                <Input value={editForm.county} onChange={e => setEditForm(p => ({ ...p, county: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 border-t pt-3">
                <Label className="text-slate-500 text-xs uppercase tracking-wide">Social Media</Label>
              </div>
              <div>
                <Label>Facebook</Label>
                <Input value={editForm.facebook} onChange={e => setEditForm(p => ({ ...p, facebook: e.target.value }))} placeholder="https://facebook.com/..." />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={editForm.instagram} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label>Twitter / X</Label>
                <Input value={editForm.twitter} onChange={e => setEditForm(p => ({ ...p, twitter: e.target.value }))} />
              </div>
              <div>
                <Label>YouTube</Label>
                <Input value={editForm.youtube} onChange={e => setEditForm(p => ({ ...p, youtube: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 border-t pt-3">
                <Label className="text-slate-500 text-xs uppercase tracking-wide">Outreach Flags</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dnc" checked={editForm.do_not_contact} onChange={e => setEditForm(p => ({ ...p, do_not_contact: e.target.checked }))} className="rounded" />
                <Label htmlFor="dnc" className="font-normal cursor-pointer">Do Not Contact</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="unsub" checked={editForm.unsubscribe_status} onChange={e => setEditForm(p => ({ ...p, unsubscribe_status: e.target.checked }))} className="rounded" />
                <Label htmlFor="unsub" className="font-normal cursor-pointer">Unsubscribed</Label>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={editForm.enrichment_notes} onChange={e => setEditForm(p => ({ ...p, enrichment_notes: e.target.value }))} rows={3} placeholder="Internal notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingOperator(null)}><X className="w-4 h-4 mr-1" />Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                <Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scrape State Selection Modal */}
      <Dialog open={showScrapeModal} onOpenChange={(open) => { if (!scrapeRunning) setShowScrapeModal(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scrape States</DialogTitle>
            <DialogDescription>
              Select which states to scrape using their dedicated scrape functions, one at a time.
            </DialogDescription>
          </DialogHeader>

          {scrapeQueue.length === 0 ? (
            <div className="space-y-4 py-2">
              {/* Select All / None */}
              <div className="flex gap-3">
                <Button size="sm" variant="outline" onClick={() => setSelectedScrapeStates([...allStates])}>Select All</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedScrapeStates([])}>Clear</Button>
                <span className="text-sm text-slate-500 self-center">{selectedScrapeStates.length} selected</span>
              </div>

              {/* State grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
                {allStates.map(state => (
                  <button
                    key={state}
                    onClick={() => toggleScrapeState(state)}
                    className={`px-2 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      selectedScrapeStates.includes(state)
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowScrapeModal(false)}>Cancel</Button>
                <Button
                  onClick={handleStartScrape}
                  disabled={selectedScrapeStates.length === 0}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Start Scraping {selectedScrapeStates.length} State{selectedScrapeStates.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {/* Progress header */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {scrapeRunning ? 'Scraping in progress...' : 'Scrape complete'}
                </span>
                <div className="flex gap-2">
                  <span className="text-xs text-slate-500">
                    {scrapeQueue.filter(q => q.status === 'done').length} done,{' '}
                    {scrapeQueue.filter(q => q.status === 'error').length} errors,{' '}
                    {scrapeQueue.filter(q => q.status === 'pending').length} pending
                  </span>
                  {scrapeRunning && (
                    <Button size="sm" variant="outline" className="border-red-400 text-red-600 h-6 text-xs" onClick={handleStopScrape}>
                      Stop
                    </Button>
                  )}
                </div>
              </div>

              {/* State rows */}
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {scrapeQueue.map(item => (
                  <div key={item.state} className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm ${
                    item.status === 'running' ? 'bg-orange-50 border-orange-200' :
                    item.status === 'done' ? 'bg-green-50 border-green-200' :
                    item.status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-slate-50 border-slate-200'
                  }`}>
                    <span className="font-semibold w-8 text-slate-700">{item.state}</span>
                    <div className="flex-1">
                      {item.status === 'pending' && <span className="text-slate-400">Waiting...</span>}
                      {item.status === 'running' && <span className="text-orange-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Scraping...</span>}
                      {item.status === 'done' && item.result && (
                        <span className="text-green-700 text-xs">
                          +{item.result.inserted ?? '?'} new · {item.result.updated ?? '?'} updated · {item.result.duplicates_deleted ?? 0} dupes removed
                        </span>
                      )}
                      {item.status === 'done' && !item.result && <span className="text-green-700">Done</span>}
                      {item.status === 'error' && <span className="text-red-600 text-xs">{item.result?.error || 'Failed'}</span>}
                    </div>
                    <div>
                      {item.status === 'pending' && <span className="w-4 h-4 rounded-full bg-slate-300 inline-block" />}
                      {item.status === 'running' && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
                      {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {item.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>

              {!scrapeRunning && (
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => { setScrapeQueue([]); setSelectedScrapeStates([]); setShowScrapeModal(false); }}>
                    Close
                  </Button>
                  <Button variant="outline" onClick={() => setScrapeQueue([])}>
                    Run Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Status Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Updating Companies for {stateFilter}</DialogTitle>
            <DialogDescription>
              {importStatus === 'importing' && 'Please wait while we scrape and import companies...'}
              {importStatus === 'success' && 'Import completed successfully!'}
              {importStatus === 'error' && 'An error occurred during import'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {importStatus === 'importing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-600">
                    Fetching city pages and extracting company data...
                  </p>
                  <p className="text-xs text-slate-500">
                    This may take a few minutes depending on the number of companies
                  </p>
                </div>
              </div>
            )}

            {importStatus === 'success' && importResults && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Update Complete!</h3>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Cities Scraped:</span>
                    <span className="font-semibold text-slate-900">{importResults.cities_scraped}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Companies Found:</span>
                    <span className="font-semibold text-slate-900">{importResults.companies_found}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">New Inserted:</span>
                    <span className="font-semibold text-green-700">{importResults.inserted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Existing Updated:</span>
                    <span className="font-semibold text-blue-700">{importResults.updated}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Duplicates Removed:</span>
                    <span className="font-semibold text-red-600">{importResults.duplicates_deleted}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-900">Final Count ({stateFilter}):</span>
                    <span className="text-xl font-bold text-orange-600">{importResults.final_count}</span>
                  </div>
                </div>

                <Button onClick={closeImportModal} className="w-full bg-orange-600 hover:bg-orange-700">
                  Close
                </Button>
              </div>
            )}

            {importStatus === 'error' && importResults && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Import Failed</h3>
                  <p className="text-sm text-red-600">{importResults.error}</p>
                </div>

                <Button onClick={closeImportModal} variant="outline" className="w-full">
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}