import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ListPlus, Search, BellOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import NewIsoDialog from '@/components/iso/NewIsoDialog';
import IsoListBuilder from '@/components/iso/IsoListBuilder';
import IsoSearchCard from '@/components/iso/IsoSearchCard';
import { loadIsoDashboard, isoFeedback, isoSetStatus, isoFulfill, isoDelete, isoRematch } from '@/components/iso/isoApi';

/**
 * ISO Center — what a customer is looking for, the matches we found, and their
 * collector lists. Reads and writes only through the ISO engine.
 */
export default function IsoCenter() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ isos: [], matches: [], intakes: [], prefs: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('searches');
  const [newOpen, setNewOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [busyIso, setBusyIso] = useState('');

  const load = async () => {
    try {
      const res = await loadIsoDashboard();
      setData({
        isos: res.isos || [],
        matches: res.matches || [],
        intakes: res.intakes || [],
        prefs: res.prefs || null,
      });
    } catch (err) {
      toast({ title: 'Could not load your searches', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const matchesByIso = useMemo(() => {
    const map = {};
    data.matches.forEach(m => {
      const key = m.wanted_item_id || '';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [data.matches]);

  const unseen = data.matches.filter(m => !m.seen && m.status !== 'dismissed').length;
  const liveIsos = data.isos.filter(i => ['active', 'paused'].includes(i.status));

  const handleFeedback = async (match, feedback) => {
    await isoFeedback({ matchId: match.id, feedback });
    load();
  };

  const handleStatus = async (iso, status) => {
    setBusyIso(iso.id);
    try {
      if (status === 'rematch') await isoRematch(iso.id);
      else await isoSetStatus({ isoId: iso.id, status });
      await load();
    } finally {
      setBusyIso('');
    }
  };

  const handleFulfill = async (iso) => {
    const strongest = (matchesByIso[iso.id] || []).find(m => m.availability !== 'unavailable');
    await isoFulfill({ isoId: iso.id, itemKey: strongest?.item_key || '' });
    toast({ title: 'Marked as found', description: `“${iso.title}” is now closed.` });
    load();
  };

  const handleDelete = async (iso) => {
    await isoDelete(iso.id);
    load();
  };

  const accountPreferences = {
    zip: user?.zip_code || user?.service_zip || '',
    state: user?.state || '',
    shipping_ok: true,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-orange-50">
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-6 h-6 text-cyan-700" /> My Searches
            </h1>
            <p className="text-sm text-slate-600">
              Tell us what you are looking for. We check published estate sales, marketplace listings and operator inventory for you.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setNewOpen(true)} className="bg-cyan-700 hover:bg-cyan-800 gap-1.5">
              <Plus className="w-4 h-4" /> New search
            </Button>
            <Button variant="outline" onClick={() => setListOpen(true)} className="gap-1.5">
              <ListPlus className="w-4 h-4" /> Build a list
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-white border border-slate-200 p-2 text-center">
            <div className="text-lg font-bold text-slate-900">{liveIsos.length}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Live searches</div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-2 text-center">
            <div className="text-lg font-bold text-cyan-800">{data.matches.length}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Matches</div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-2 text-center">
            <div className="text-lg font-bold text-emerald-700">{unseen}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">New</div>
          </div>
        </div>

        {data.prefs && data.prefs.email_enabled === false && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 flex items-start gap-2">
            <BellOff className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900">
              Match emails are turned off in your notification settings. Your matches still appear here.
            </p>
          </div>
        )}

        <div className="flex gap-1 mt-4 border-b border-slate-200">
          {[
            { key: 'searches', label: 'Searches' },
            { key: 'lists', label: 'Lists' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading your searches…
          </div>
        ) : tab === 'searches' ? (
          data.isos.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="p-8 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600 mb-3">
                  You have no searches yet. Describe an item, answer three questions, or show us a photo.
                </p>
                <Button onClick={() => setNewOpen(true)} className="bg-cyan-700 hover:bg-cyan-800 gap-1.5">
                  <Plus className="w-4 h-4" /> Start my first search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 mt-4">
              {data.isos.map(iso => (
                <IsoSearchCard
                  key={iso.id}
                  iso={iso}
                  matches={matchesByIso[iso.id] || []}
                  onFeedback={handleFeedback}
                  onStatus={handleStatus}
                  onFulfill={handleFulfill}
                  onDelete={handleDelete}
                  busyMatch={busyIso}
                />
              ))}
            </div>
          )
        ) : data.intakes.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="p-8 text-center">
              <ListPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-3">
                Buying for a collection or booth? Build a list of categories and brands in one pass.
              </p>
              <Button variant="outline" onClick={() => setListOpen(true)} className="gap-1.5">
                <ListPlus className="w-4 h-4" /> Build a list
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mt-4">
            {data.intakes.map(intake => (
              <Card key={intake.id}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{intake.list_name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{intake.role}</Badge>
                        {(intake.brands || []).slice(0, 4).map(b => (
                          <Badge key={b.name} variant="outline" className="text-[10px]">{b.name}</Badge>
                        ))}
                        {(intake.categories || []).slice(0, 3).map(c => (
                          <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                        ))}
                      </div>
                      {(intake.skipped_duplicates || []).length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Skipped duplicates you already had: {intake.skipped_duplicates.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-slate-900">{intake.created_interest_count || 0}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500">searches</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <NewIsoDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onOpenList={() => { setNewOpen(false); setListOpen(true); }}
        onSaved={(res) => {
          setNewOpen(false);
          const found = res?.match ? (res.match.strong || 0) + (res.match.possible || 0) : 0;
          toast({
            title: 'Search saved',
            description: found > 0 ? `We already found ${found} possible match${found === 1 ? '' : 'es'}.` : 'We will keep checking for you.',
          });
          load();
        }}
        accountPreferences={accountPreferences}
      />

      <IsoListBuilder
        open={listOpen}
        onClose={() => setListOpen(false)}
        onSaved={(res) => {
          setListOpen(false);
          const created = (res?.created || []).length;
          toast({
            title: 'List saved',
            description: created > 0 ? `${created} interest${created === 1 ? '' : 's'} added to your searches.` : 'Those interests were already on your list.',
          });
          setTab('searches');
          load();
        }}
      />
    </div>
  );
}