import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Globe, MapPin, Calendar, RefreshCw, Plus, Zap, Building2,
  CheckCircle, AlertCircle, Eye, Link2, Trash2, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_BADGE = {
  imported:  'bg-amber-100 text-amber-700',
  matched:   'bg-amber-100 text-amber-700',
  claimed:   'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
  ignored:   'bg-red-100 text-red-700'
};

const STATUS_LABEL = {
  imported:  'Imported from public listing — operator verification pending',
  matched:   'Imported from public listing — operator verification pending',
  claimed:   'Claimed by operator',
  published: 'Published on platform',
  ignored:   'Ignored'
};

export default function ImportedSalesDashboard() {
  const [territories, setTerritories] = useState([]);
  const [sales, setSales] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showTerritoryForm, setShowTerritoryForm] = useState(false);
  const [filterTerritory, setFilterTerritory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTerritory, setNewTerritory] = useState({
    name: '', state: '', counties: '', zip_codes: '', search_urls: '', is_active: true
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [t, s, o] = await Promise.all([
      base44.entities.ScrapedSaleTerritory.list('-created_date', 100),
      base44.entities.ImportedSale.list('-last_seen_at', 500),
      base44.entities.ScrapedSaleOperator.list('-total_sales_scraped', 200)
    ]);
    setTerritories(t || []);
    setSales(s || []);
    setOperators(o || []);
    setLoading(false);
  };

  const handleScrape = async (territoryId) => {
    setScraping(true);
    try {
      const payload = territoryId ? { territory_id: territoryId } : {};
      const res = await base44.functions.invoke('scrapeEstateSalesNet', payload);
      const data = res.data;
      const summary = data.results?.map(r =>
        `${r.territory}: ${r.new_sales || 0} new, ${r.updated_sales || 0} updated${r.errors?.length ? ` (${r.errors.length} errors)` : ''}`
      ).join('\n') || 'Done';
      alert(`Scrape complete!\n\n${summary}`);
      await loadAll();
    } catch (err) {
      alert('Scrape error: ' + err.message);
    }
    setScraping(false);
  };

  const handleStatusChange = async (saleId, status) => {
    await base44.entities.ImportedSale.update(saleId, { status });
    setSales(s => s.map(x => x.id === saleId ? { ...x, status } : x));
  };

  const handleSaveTerritory = async () => {
    const data = {
      ...newTerritory,
      counties: newTerritory.counties.split(',').map(c => c.trim()).filter(Boolean),
      zip_codes: newTerritory.zip_codes.split(',').map(z => z.trim()).filter(Boolean),
      search_urls: newTerritory.search_urls.split('\n').map(u => u.trim()).filter(Boolean)
    };
    await base44.entities.ScrapedSaleTerritory.create(data);
    setShowTerritoryForm(false);
    setNewTerritory({ name: '', state: '', counties: '', zip_codes: '', search_urls: '', is_active: true });
    await loadAll();
  };

  const filteredSales = sales.filter(s => {
    const tMatch = filterTerritory === 'all' || s.territory_id === filterTerritory;
    const stMatch = filterStatus === 'all' || s.status === filterStatus;
    const qMatch = !searchQuery ||
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.operator_name_raw?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase());
    return tMatch && stMatch && qMatch;
  });

  const stats = {
    total: sales.length,
    imported: sales.filter(s => s.status === 'imported').length,
    matched: sales.filter(s => s.status === 'matched').length,
    published: sales.filter(s => s.status === 'published').length,
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-slate-500">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Imported Sales</h1>
              <p className="text-sm text-slate-500">EstateSales.net scraped listings by territory</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => handleScrape(null)} disabled={scraping} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Zap className="w-4 h-4 mr-2" />
              {scraping ? 'Scraping...' : 'Run Scraper (All)'}
            </Button>
            <Button onClick={() => setShowTerritoryForm(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Territory
            </Button>
            <Button onClick={loadAll} variant="ghost" size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Scraped', value: stats.total, color: 'text-slate-700' },
            { label: 'Unmatched', value: stats.imported, color: 'text-yellow-600' },
            { label: 'Operator Matched', value: stats.matched, color: 'text-blue-600' },
            { label: 'Published', value: stats.published, color: 'text-green-600' },
          ].map((s, i) => (
            <Card key={i} className="shadow-sm bg-white">
              <CardContent className="p-4">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="mb-6">
            <TabsTrigger value="sales">Scraped Sales ({filteredSales.length})</TabsTrigger>
            <TabsTrigger value="territories">Territories ({territories.length})</TabsTrigger>
            <TabsTrigger value="operators">Operators ({operators.length})</TabsTrigger>
          </TabsList>

          {/* SALES TAB */}
          <TabsContent value="sales">
            <div className="flex flex-wrap gap-3 mb-4">
              <Input
                placeholder="Search title, operator, city..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-64 bg-white"
              />
              <select value={filterTerritory} onChange={e => setFilterTerritory(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">All Territories</option>
                {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">All Statuses</option>
                <option value="imported">Imported</option>
                <option value="matched">Matched</option>
                <option value="claimed">Claimed</option>
                <option value="published">Published</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>

            {filteredSales.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <Globe className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">No scraped sales yet</p>
                <p className="text-slate-400 text-sm mb-6">Add a territory with EstateSales.net search URLs, then run the scraper.</p>
                <Button onClick={() => handleScrape(null)} disabled={scraping} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Zap className="w-4 h-4 mr-2" /> Run Scraper
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSales.map(sale => (
                  <Card key={sale.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {sale.image_urls_limited?.[0] && (
                          <img src={sale.image_urls_limited[0]} alt={sale.title}
                            className="w-20 h-16 rounded-lg object-cover flex-shrink-0 border" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge className={STATUS_BADGE[sale.status] || 'bg-slate-100 text-slate-700'}>
                              {STATUS_LABEL[sale.status] || sale.status}
                            </Badge>
                            {sale.platform_operator_user_id && (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle className="w-3 h-3 mr-1" /> Platform User
                              </Badge>
                            )}
                            {sale.operator_id && !sale.platform_operator_user_id && (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Link2 className="w-3 h-3 mr-1" /> Operator Linked
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{sale.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            {sale.operator_name_raw || 'Unknown operator'}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sale.address_full || sale.address_partial || [sale.city, sale.state, sale.zip].filter(Boolean).join(', ')}
                            </span>
                            {sale.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(sale.start_date + 'T12:00:00'), 'MMM d')}
                                {sale.end_date && sale.end_date !== sale.start_date && ` – ${format(new Date(sale.end_date + 'T12:00:00'), 'MMM d')}`}
                              </span>
                            )}
                            {sale.image_count_source > 0 && <span>📷 {sale.image_count_source} photos</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => setSelectedSale(sale)}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <a href={sale.source_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TERRITORIES TAB */}
          <TabsContent value="territories">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {territories.map(t => (
                <Card key={t.id} className="bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600" />
                      </div>
                      <Badge className={t.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{t.name}</h3>
                    <p className="text-sm text-slate-500 mb-3">{t.state} · {(t.counties || []).join(', ')}</p>
                    <div className="text-xs text-slate-400 space-y-1 mb-4">
                      <p>{(t.search_urls || []).length} search URLs configured</p>
                      <p>{t.last_scrape_count || 0} sales in last run</p>
                      {t.last_scraped_at && <p>Last scraped: {format(new Date(t.last_scraped_at), 'MMM d, h:mm a')}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => handleScrape(t.id)} disabled={scraping}>
                        <Zap className="w-3 h-3 mr-1" /> Scrape Now
                      </Button>
                    </div>
                    {(!t.search_urls?.length) && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> No search URLs — add EstateSales.net search URLs to enable scraping
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <button onClick={() => setShowTerritoryForm(true)}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors">
                <Plus className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Add Territory</span>
              </button>
            </div>
          </TabsContent>

          {/* OPERATORS TAB */}
          <TabsContent value="operators">
            <div className="space-y-3">
              {operators.map(op => (
                <Card key={op.id} className="bg-white shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-1">
                        <Badge className={
                          op.platform_user_id ? 'bg-emerald-100 text-emerald-700' :
                          op.match_confidence === 'auto_matched' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }>
                          {op.platform_user_id ? '✓ Platform User' : op.match_confidence}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{op.company_name}</h3>
                      {op.aliases?.length > 0 && (
                        <p className="text-xs text-slate-400">Also: {op.aliases.join(', ')}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {op.total_sales_scraped || 0} sales · {(op.territory_ids || []).length} territories
                        {op.phone && ` · ${op.phone}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {op.source_profile_url && (
                        <a href={op.source_profile_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="w-3 h-3 mr-1" /> Profile</Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSale.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_BADGE[selectedSale.status]}>{STATUS_LABEL[selectedSale.status] || selectedSale.status}</Badge>
                {selectedSale.platform_operator_user_id && <Badge className="bg-emerald-100 text-emerald-700">Platform User</Badge>}
              </div>

              {selectedSale.image_urls_limited?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selectedSale.image_urls_limited.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-32 w-48 object-cover rounded-lg flex-shrink-0" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400 text-xs block">Operator</span>{selectedSale.operator_name_raw || '—'}</div>
                <div><span className="text-slate-400 text-xs block">Location</span>{selectedSale.address_partial || [selectedSale.city, selectedSale.state].filter(Boolean).join(', ')}</div>
                <div><span className="text-slate-400 text-xs block">Start Date</span>{selectedSale.start_date || '—'}</div>
                <div><span className="text-slate-400 text-xs block">End Date</span>{selectedSale.end_date || '—'}</div>
                <div><span className="text-slate-400 text-xs block">Source</span>
                  <a href={selectedSale.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-xs">{selectedSale.source}</a>
                </div>
                <div><span className="text-slate-400 text-xs block">Images on Source</span>{selectedSale.image_count_source || 0}</div>
              </div>

              {selectedSale.sale_times?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Sale Times</p>
                  {selectedSale.sale_times.map((t, i) => (
                    <p key={i} className="text-sm">{t.date}: {t.start_time} – {t.end_time}</p>
                  ))}
                </div>
              )}

              {selectedSale.categories?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSale.categories.map(c => <Badge key={c} className="bg-slate-100 text-slate-600 text-xs">{c}</Badge>)}
                </div>
              )}

              {selectedSale.description_snippet && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{selectedSale.description_snippet}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {['matched', 'published', 'ignored'].map(s => (
                  <Button key={s} size="sm" variant={selectedSale.status === s ? 'default' : 'outline'}
                    onClick={() => { handleStatusChange(selectedSale.id, s); setSelectedSale(prev => ({ ...prev, status: s })); }}>
                    Mark {s}
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Territory Modal */}
      {showTerritoryForm && (
        <Dialog open={showTerritoryForm} onOpenChange={setShowTerritoryForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Scrape Territory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Territory Name *</label>
                  <Input placeholder="Monmouth County NJ" value={newTerritory.name} onChange={e => setNewTerritory(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">State *</label>
                  <Input placeholder="NJ" value={newTerritory.state} onChange={e => setNewTerritory(p => ({ ...p, state: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Counties (comma-separated)</label>
                <Input placeholder="Monmouth, Ocean" value={newTerritory.counties} onChange={e => setNewTerritory(p => ({ ...p, counties: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">ZIP Codes (comma-separated)</label>
                <Input placeholder="07701, 07712" value={newTerritory.zip_codes} onChange={e => setNewTerritory(p => ({ ...p, zip_codes: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">EstateSales.net Search URLs (one per line)</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={'https://www.estatesales.net/NJ/Red-Bank\nhttps://www.estatesales.net/NJ/Asbury-Park'}
                  value={newTerritory.search_urls}
                  onChange={e => setNewTerritory(p => ({ ...p, search_urls: e.target.value }))}
                />
                <p className="text-xs text-slate-400 mt-1">Paste the EstateSales.net city/county search pages for this territory</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSaveTerritory} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">Save Territory</Button>
                <Button variant="outline" onClick={() => setShowTerritoryForm(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}