import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, RefreshCw, Send, Ban, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

const STATUS_VARIANT = {
  published: 'default',
  pending: 'secondary',
  update_pending: 'outline',
  failed: 'destructive',
  unpublished: 'secondary',
  suspended: 'destructive',
  draft: 'secondary'
};

export default function PublicationPanel() {
  const [sales, setSales] = useState([]);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [publications, setPublications] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setIsAdmin(me.role === 'admin');
        const query = me.role === 'admin' ? {} : { operator_id: me.id };
        const res = await base44.entities.EstateSale.filter(query, { sort: '-updated_date', limit: 100, fields: ['id', 'title', 'status', 'company_id', 'updated_date'] });
        setSales(res.items || res || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadStatus = useCallback(async (saleId) => {
    if (!saleId) { setPublications([]); setDestinations([]); return; }
    setBusy(true);
    setMessage(null);
    try {
      const res = await base44.functions.invoke('publishSale', { action: 'status', sale_id: saleId });
      setPublications(res.data.publications || []);
      setDestinations(res.data.available_destinations || []);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Could not load publication status' });
      setPublications([]);
    } finally {
      setBusy(false);
    }
  }, []);

  const act = async (action) => {
    if (!selectedSaleId) return;
    setBusy(true);
    setMessage(null);
    try {
      const destinationId = publications[0]?.destination?.id || destinations[0]?.id;
      if (!destinationId) {
        setMessage({ type: 'error', text: 'No website destination exists for this sale\u2019s company yet.' });
        setBusy(false);
        return;
      }
      const res = await base44.functions.invoke('publishSale', { action, sale_id: selectedSaleId, destination_id: destinationId });
      const pub = res.data.publication;
      if (action === 'publish') {
        setMessage(pub.status === 'published'
          ? { type: 'success', text: 'Published to ' + (pub.destination_hint || 'destination') }
          : { type: 'info', text: 'Publication saved — status: ' + pub.status + (pub.last_error ? ' (' + pub.last_error.replace(/_/g, ' ') + ')' : '') });
      } else {
        setMessage({ type: 'info', text: 'Unpublished from destination. The EstateSalen sale was not deleted.' });
      }
      await loadStatus(selectedSaleId);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Action failed' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const selectedSale = sales.find(s => s.id === selectedSaleId);
  const hasPublication = publications.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Globe className="w-5 h-5 text-sage-600" /> Publish to Website</CardTitle>
          <CardDescription>
            Publishing connects this sale to a website destination. EstateSalen stays the operational source of truth — the website only presents it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sale</label>
            <select
              value={selectedSaleId}
              onChange={(e) => { setSelectedSaleId(e.target.value); loadStatus(e.target.value); }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select a sale…</option>
              {sales.map(s => (
                <option key={s.id} value={s.id}>{s.title} ({s.status})</option>
              ))}
            </select>
          </div>

          {message && (
            <div className={`text-sm rounded-md px-3 py-2 border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              {message.text}
            </div>
          )}

          {selectedSale && (
            <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
              {hasPublication ? publications.map(p => (
                <div key={p.id} className="p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{p.destination?.name || 'Unknown destination'}</span>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status] || 'secondary'}>{p.status.replace(/_/g, ' ')}</Badge>
                  {p.adopted && <span className="text-xs text-slate-500">adopted existing site record ({p.external_reference})</span>}
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    {p.last_success_at ? <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> last published {new Date(p.last_success_at).toLocaleString()}</> : <><Clock className="w-3 h-3" /> never delivered</>}
                  </span>
                  {p.last_error && <span className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {p.last_error.replace(/_/g, ' ')}</span>}
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" disabled={busy || p.destination?.status !== 'active'} onClick={() => act('publish')}>
                      <Send className="w-3.5 h-3.5 mr-1" /> {p.status === 'published' ? 'Republish' : 'Publish'}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act('unpublish')}>
                      <Ban className="w-3.5 h-3.5 mr-1" /> Unpublish
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-3 text-sm text-slate-600">
                  Not published yet. Publishing creates a publication connection — it does not create a second sale.
                </div>
              )}
            </div>
          )}

          {busy && <div className="text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin" /> Working…</div>}
        </CardContent>
      </Card>
    </div>
  );
}