import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Target } from 'lucide-react';
import IsoMatchRow from '@/components/iso/IsoMatchRow';

/**
 * ISO matches for one sale: the operator presses the button, the scan reads the
 * sale's item list against the customers' ISO database and the possible matches
 * are listed here. Matches stay saved on the sale, so this list is still there
 * next time; the operator dismisses the pairings that are wrong.
 */
export default function SaleIsoMatchModal({ open, onClose, sale }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [dismissingId, setDismissingId] = useState(null);
  const [scanned, setScanned] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !sale?.id) return;
    let active = true;
    setLoading(true);
    setError('');
    setScanning(false);
    setScanned(null);
    setNote('');
    base44.functions.invoke('scanSaleIsoMatches', { action: 'list', sale_id: sale.id })
      .then(res => { if (active) setMatches(res.data?.matches || []); })
      .catch(() => { if (active) setError('Could not load the ISO matches for this sale.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, sale?.id]);

  const runScan = async () => {
    setScanning(true);
    setError('');
    setNote('');
    try {
      const res = await base44.functions.invoke('scanSaleIsoMatches', { action: 'scan', sale_id: sale.id });
      setMatches(res.data?.matches || []);
      setScanned(res.data?.scanned || null);
      setNote(res.data?.note || '');
    } catch (e) {
      setError('The scan could not finish. Try again in a moment.');
    } finally {
      setScanning(false);
    }
  };

  const dismiss = async (match) => {
    setDismissingId(match.id);
    try {
      const res = await base44.functions.invoke('scanSaleIsoMatches', { action: 'dismiss', sale_id: sale.id, match_id: match.id });
      setMatches(res.data?.matches || []);
    } catch (e) {
      setError('Could not dismiss that match.');
    } finally {
      setDismissingId(null);
    }
  };

  const open_matches = matches.filter(match => match.status !== 'dismissed');

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-cyan-700" /> ISO matches
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Buyers' "in search of" requests matched against this sale's items. {sale?.title ? <span className="font-medium">{sale.title}</span> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button onClick={runScan} disabled={scanning} className="w-full bg-cyan-700 hover:bg-cyan-800">
            {scanning
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning the sale against the ISO database…</>
              : <><Sparkles className="w-4 h-4 mr-1.5" /> {open_matches.length ? 'Scan again for ISO matches' : 'Scan this sale for ISO matches'}</>}
          </Button>

          {scanning && (
            <p className="text-[11px] text-slate-500">
              Reading every named item in this sale and the active ISO requests, then checking which ones genuinely match. This can take a moment.
            </p>
          )}

          {note && <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">{note}</p>}
          {error && <p className="text-[12px] text-red-600">{error}</p>}

          {scanned && !note && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span>{scanned.items} sale item{scanned.items === 1 ? '' : 's'}</span>
              <span>·</span>
              <span>{scanned.isos} active ISO request{scanned.isos === 1 ? '' : 's'}</span>
              {typeof scanned.considered === 'number' && <><span>·</span><span>{scanned.considered} worth checking</span></>}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading matches…
            </div>
          ) : matches.length === 0 ? (
            <p className="text-[12px] text-slate-500 py-2">
              No ISO matches yet. Press the button above to scan this sale's items against what customers are looking for.
            </p>
          ) : (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {open_matches.length} possible match{open_matches.length === 1 ? '' : 'es'}
              </div>
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {matches.map(match => (
                  <IsoMatchRow
                    key={match.id}
                    match={match}
                    dismissing={dismissingId === match.id}
                    onDismiss={match.status === 'dismissed' ? null : dismiss}
                  />
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-slate-400">
                These are suggestions to check, not confirmed sales. A buyer marked "not open to dealer contact" asked not to be approached.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}