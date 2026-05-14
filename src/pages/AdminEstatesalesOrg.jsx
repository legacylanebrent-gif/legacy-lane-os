import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, RefreshCw, Search, ExternalLink, Globe, Phone, Building2 } from 'lucide-react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const TIER_COLORS = {
  elite: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-slate-100 text-slate-800',
  basic: 'bg-blue-50 text-blue-700',
  unknown: 'bg-gray-100 text-gray-500',
};

export default function AdminEstatesalesOrg() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [selectedState, setSelectedState] = useState('NJ');
  const [filterState, setFilterState] = useState('NJ');
  const [filterTier, setFilterTier] = useState('all');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    loadRecords();
    loadCounts();
  }, [filterState, filterTier]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const filter = { source_state: filterState };
      if (filterTier !== 'all') filter.membership_tier = filterTier;
      const data = await base44.entities.EstatesalesOrgOperator.filter(filter, '-last_scraped_at', 100);
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const all = await base44.entities.EstatesalesOrgOperator.filter({ source_state: filterState }, '-created_date', 500);
      const c = { total: all.length, listing_only: 0, detail_scraped: 0, failed: 0 };
      all.forEach(r => { if (c[r.scrape_status] !== undefined) c[r.scrape_status]++; });
      setCounts(c);
    } catch (e) {}
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    try {
      const res = await base44.functions.invoke('scrapeEstatesalesOrgState', {
        state: selectedState.toLowerCase(),
        mode: 'listing',
      });
      setScrapeResult(res.data);
      await loadRecords();
      await loadCounts();
    } catch (e) {
      setScrapeResult({ error: e.message });
    } finally {
      setScraping(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setScrapeResult(null);
    try {
      const res = await base44.functions.invoke('scrapeEstatesalesOrgState', {
        state: filterState.toLowerCase(),
        mode: 'detail',
        detail_limit: 30,
      });
      setScrapeResult(res.data);
      await loadRecords();
      await loadCounts();
    } catch (e) {
      setScrapeResult({ error: e.message });
    } finally {
      setEnriching(false);
    }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.company_name || '').toLowerCase().includes(q) ||
           (r.base_city || '').toLowerCase().includes(q) ||
           (r.phone || '').includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">EstateSales.org Operator Scraper</h1>
        <p className="text-slate-500 text-sm mt-1">Scrape and manage estate sale company data from estatesales.org</p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">State to Scrape</label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleScrape} disabled={scraping} className="bg-slate-800 text-white">
              {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {scraping ? 'Scraping Listings...' : 'Scrape Listings'}
            </Button>
            <Button onClick={handleEnrich} disabled={enriching} variant="outline">
              {enriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {enriching ? 'Enriching Details...' : `Enrich Details (${filterState})`}
            </Button>
          </div>

          {scrapeResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${scrapeResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
              {scrapeResult.error ? `Error: ${scrapeResult.error}` : (
                <span>
                  {scrapeResult.mode === 'listing'
                    ? `✓ Scraped ${scrapeResult.cities_scraped} cities — ${scrapeResult.new_records} new records, ${scrapeResult.skipped} skipped`
                    : `✓ Enriched ${scrapeResult.enriched} records — ${scrapeResult.failed} failed`}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter & Stats Row */}
      <div className="flex flex-wrap gap-4 items-center mb-4">
        <Select value={filterState} onValueChange={setFilterState}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTier} onValueChange={setFilterTier}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search company or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-3 text-sm text-slate-600 ml-auto">
          <span className="font-medium">{counts.total || 0} total</span>
          <span className="text-orange-600">{counts.listing_only || 0} listing-only</span>
          <span className="text-green-600">{counts.detail_scraped || 0} enriched</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">Company</th>
                <th className="text-left p-3 font-medium text-slate-600">Location</th>
                <th className="text-left p-3 font-medium text-slate-600">Tier</th>
                <th className="text-left p-3 font-medium text-slate-600">Contact</th>
                <th className="text-left p-3 font-medium text-slate-600">Stats</th>
                <th className="text-left p-3 font-medium text-slate-600">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{r.company_name}</div>
                    {r.bonded_insured && <span className="text-xs text-green-600">✓ Bonded & Insured</span>}
                    {r.award_winner && <span className="text-xs text-yellow-600 ml-2">🏆 Award Winner</span>}
                  </td>
                  <td className="p-3 text-slate-600">
                    <div>{r.base_city}, {r.base_state}</div>
                    {r.scraped_city && <div className="text-xs text-slate-400">via {r.scraped_city}</div>}
                  </td>
                  <td className="p-3">
                    <Badge className={`text-xs ${TIER_COLORS[r.membership_tier] || TIER_COLORS.unknown}`}>
                      {r.membership_tier || 'unknown'}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-600">
                    {r.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</div>}
                    {r.website_url && (
                      <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                        <Globe className="w-3 h-3" />Website
                      </a>
                    )}
                    {r.email && <div className="text-xs text-slate-500">{r.email}</div>}
                  </td>
                  <td className="p-3 text-slate-600 text-xs">
                    {r.years_in_business && <div>{r.years_in_business}y exp</div>}
                    {r.sales_posted && <div>{r.sales_posted.toLocaleString()} past sales</div>}
                    {r.member_since && <div>Since {r.member_since}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-xs ${r.scrape_status === 'detail_scraped' ? 'border-green-300 text-green-700' : r.scrape_status === 'failed' ? 'border-red-300 text-red-600' : 'border-orange-300 text-orange-600'}`}>
                      {r.scrape_status === 'detail_scraped' ? 'Enriched' : r.scrape_status === 'failed' ? 'Failed' : 'Listing Only'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <a href={r.profile_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                    </a>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No records found. Run a scrape to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}