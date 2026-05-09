import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Mail, Search, RefreshCw, Play, CheckCircle2, XCircle,
  AlertTriangle, Clock, BarChart3, Settings, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

const STATUS_COLORS = {
  not_started: 'bg-slate-100 text-slate-600',
  searching: 'bg-blue-100 text-blue-700',
  found: 'bg-cyan-100 text-cyan-700',
  verified: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  needs_manual_review: 'bg-yellow-100 text-yellow-700',
};

const VERIFIED_COLORS = {
  unverified: 'bg-slate-100 text-slate-600',
  valid: 'bg-green-100 text-green-700',
  invalid: 'bg-red-100 text-red-700',
  risky: 'bg-yellow-100 text-yellow-700',
  catch_all: 'bg-orange-100 text-orange-700',
  unknown: 'bg-slate-100 text-slate-600',
};

export default function CompanyEmailEnrichment() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [enrichingIds, setEnrichingIds] = useState(new Set());
  const [showSettings, setShowSettings] = useState(false);

  // Filters
  const [filterState, setFilterState] = useState('all');
  const [filterEnrichment, setFilterEnrichment] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  const [filterMinScore, setFilterMinScore] = useState('');
  const [filterCounty, setFilterCounty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk settings
  const [bulkLimit, setBulkLimit] = useState(25);
  const [bulkOnlyMissing, setBulkOnlyMissing] = useState(true);

  // API settings
  const [apiSettings, setApiSettings] = useState({ provider: 'none', apiKey: '' });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.FutureEstateOperator.list('-created_date', 500);
      setCompanies(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const filtered = companies.filter(c => {
    if (filterState !== 'all' && c.state !== filterState) return false;
    if (filterEnrichment !== 'all' && (c.enrichment_status || 'not_started') !== filterEnrichment) return false;
    if (filterVerified !== 'all' && (c.email_verified_status || 'unverified') !== filterVerified) return false;
    if (filterMinScore && (c.email_confidence_score || 0) < Number(filterMinScore)) return false;
    if (filterCounty && !c.county?.toLowerCase().includes(filterCounty.toLowerCase())) return false;
    if (searchQuery && !c.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !c.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: companies.length,
    missingEmail: companies.filter(c => !c.email).length,
    enriched: companies.filter(c => c.enrichment_status === 'verified' || c.enrichment_status === 'found').length,
    needsReview: companies.filter(c => c.enrichment_status === 'needs_manual_review').length,
    verified: companies.filter(c => c.email_verified_status === 'valid').length,
    risky: companies.filter(c => c.email_verified_status === 'risky').length,
    invalid: companies.filter(c => c.email_verified_status === 'invalid').length,
  };

  const handleEnrichOne = async (companyId) => {
    setEnrichingIds(prev => new Set([...prev, companyId]));
    try {
      await base44.functions.invoke('enrichCompanyEmail', { company_id: companyId });
      await loadCompanies();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setEnrichingIds(prev => { const n = new Set(prev); n.delete(companyId); return n; }); }
  };

  const handleBulkRun = async () => {
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const res = await base44.functions.invoke('bulkEnrichCompanyEmails', {
        limit: bulkLimit,
        state: filterState !== 'all' ? filterState : undefined,
        county: filterCounty || undefined,
        only_missing_email: bulkOnlyMissing
      });
      setBulkResult(res.data || res);
      await loadCompanies();
    } catch (e) { alert('Bulk error: ' + e.message); }
    finally { setBulkRunning(false); }
  };

  const handleSaveSettings = async () => {
    // Store as user preference / admin note — provider key goes in secrets via dashboard
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Company Email Enrichment</h1>
          <p className="text-slate-500 mt-1">Find, verify, and store email addresses for your estate sale company database.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(s => !s)}>
            <Settings className="w-4 h-4 mr-2" />Settings {showSettings ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          <Button variant="outline" onClick={loadCompanies} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* API Settings Panel */}
      {showSettings && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4" />Email Verification Provider Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Verification Provider</Label>
                <Select value={apiSettings.provider} onValueChange={v => setApiSettings(p => ({ ...p, provider: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (no verification)</SelectItem>
                    <SelectItem value="zerobounce">ZeroBounce</SelectItem>
                    <SelectItem value="hunter">Hunter.io</SelectItem>
                    <SelectItem value="neverbounce">NeverBounce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>API Key</Label>
                <Input className="mt-1" type="password" value={apiSettings.apiKey} onChange={e => setApiSettings(p => ({ ...p, apiKey: e.target.value }))} placeholder="Set via Dashboard → Settings → Secrets: EMAIL_VERIFY_API_KEY" disabled />
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border text-sm text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">To activate email verification:</p>
              <p>1. Go to <strong>Dashboard → Code → Settings → Environment Variables</strong></p>
              <p>2. Add <code className="bg-slate-100 px-1 rounded">EMAIL_VERIFY_API_KEY</code> with your provider's API key</p>
              <p>3. Add <code className="bg-slate-100 px-1 rounded">EMAIL_VERIFY_PROVIDER</code> with value: <code className="bg-slate-100 px-1 rounded">zerobounce</code>, <code className="bg-slate-100 px-1 rounded">hunter</code>, or <code className="bg-slate-100 px-1 rounded">neverbounce</code></p>
            </div>
            <Button size="sm" onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700">
              {settingsSaved ? '✓ Noted' : 'Got it'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-900' },
          { label: 'Missing Email', value: stats.missingEmail, color: 'text-orange-600' },
          { label: 'Enriched', value: stats.enriched, color: 'text-cyan-600' },
          { label: 'Needs Review', value: stats.needsReview, color: 'text-yellow-600' },
          { label: 'Verified', value: stats.verified, color: 'text-green-600' },
          { label: 'Risky', value: stats.risky, color: 'text-orange-500' },
          { label: 'Invalid', value: stats.invalid, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Run */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Play className="w-4 h-4" />Bulk Email Enrichment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">Batch Size</Label>
              <Input type="number" className="w-24 mt-1" value={bulkLimit} onChange={e => setBulkLimit(Number(e.target.value))} min={1} max={100} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={bulkOnlyMissing} onCheckedChange={setBulkOnlyMissing} />
              <Label className="text-sm">Only companies missing email</Label>
            </div>
            <Button onClick={handleBulkRun} disabled={bulkRunning} className="bg-orange-600 hover:bg-orange-700">
              {bulkRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</> : <><Play className="w-4 h-4 mr-2" />Run Email Enrichment</>}
            </Button>
          </div>
          {bulkResult && (
            <div className="flex flex-wrap gap-4 p-3 bg-green-50 rounded-lg border border-green-200 text-sm">
              <span>✅ <strong>{bulkResult.found}</strong> found</span>
              <span>❌ <strong>{bulkResult.failed}</strong> failed</span>
              <span>⏭️ <strong>{bulkResult.skipped}</strong> skipped</span>
              <span>📦 <strong>{bulkResult.processed}</strong> processed</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input placeholder="Search company or email..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-28"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="County..." className="w-36" value={filterCounty} onChange={e => setFilterCounty(e.target.value)} />
            <Select value={filterEnrichment} onValueChange={setFilterEnrichment}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Enrichment Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enrichment</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="searching">Searching</SelectItem>
                <SelectItem value="found">Found</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="needs_manual_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVerified} onValueChange={setFilterVerified}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Verified Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
                <SelectItem value="risky">Risky</SelectItem>
                <SelectItem value="catch_all">Catch-All</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Input placeholder="Min score" className="w-24" type="number" value={filterMinScore} onChange={e => setFilterMinScore(e.target.value)} min={0} max={100} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Showing {filtered.length} of {companies.length} companies</p>
        </CardContent>
      </Card>

      {/* Company Table */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />Loading companies...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />No companies match your filters</div>
        ) : (
          filtered.map(company => (
            <CompanyRow
              key={company.id}
              company={company}
              enriching={enrichingIds.has(company.id)}
              onEnrich={() => handleEnrichOne(company.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CompanyRow({ company, enriching, onEnrich }) {
  const [expanded, setExpanded] = useState(false);
  const enrichStatus = company.enrichment_status || 'not_started';
  const verifiedStatus = company.email_verified_status || 'unverified';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-slate-900 truncate">{company.company_name}</span>
              <span className="text-xs text-slate-500">{company.city}, {company.state}</span>
              {company.county && <span className="text-xs text-slate-400">{company.county} Co.</span>}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={STATUS_COLORS[enrichStatus] || 'bg-slate-100 text-slate-600'}>{enrichStatus.replace(/_/g, ' ')}</Badge>
              {company.email && (
                <>
                  <Badge className={VERIFIED_COLORS[verifiedStatus] || 'bg-slate-100 text-slate-600'}>{verifiedStatus}</Badge>
                  {company.email_confidence_score != null && (
                    <span className="text-xs text-slate-500">Score: <strong>{company.email_confidence_score}</strong></span>
                  )}
                </>
              )}
              {company.do_not_contact && <Badge className="bg-red-100 text-red-700">DNC</Badge>}
            </div>
            {company.email && (
              <div className="mt-1 text-sm text-slate-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{company.email}</span>
                {company.email_source_type && <span className="text-xs text-slate-400">via {company.email_source_type.replace(/_/g, ' ')}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {company.alternate_emails?.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setExpanded(e => !e)}>
                +{company.alternate_emails.length} alt {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onEnrich}
              disabled={enriching || company.do_not_contact}
              className="border-orange-400 text-orange-700 hover:bg-orange-50"
            >
              {enriching ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Search className="w-3.5 h-3.5 mr-1" />}
              {enriching ? 'Searching...' : 'Find Email'}
            </Button>
          </div>
        </div>

        {expanded && company.alternate_emails?.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Alternate Emails</p>
            {company.alternate_emails.map((email, i) => (
              <div key={i} className="text-sm font-mono text-slate-600 flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-300" />{email}
              </div>
            ))}
            {company.enrichment_notes && (
              <p className="text-xs text-slate-400 mt-1">{company.enrichment_notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}