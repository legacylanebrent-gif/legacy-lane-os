import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { opportunities, LISTING_STATUS_LABELS } from './listingApi';
import OwnershipBadge from './OwnershipBadge';
import OwnershipEvidence from './OwnershipEvidence';
import ServiceNeedPanel from './ServiceNeedPanel';
import OpportunityTasks from './OpportunityTasks';
import OutreachPanel from './OutreachPanel';
import AddressCorrection from './AddressCorrection';

export default function OpportunityDetailDialog({ opportunityId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!opportunityId) return;
    try {
      setData(await opportunities.detail(opportunityId));
    } catch (e) {
      setError(e.message);
    }
  }, [opportunityId]);

  useEffect(() => {
    setData(null);
    setError('');
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged?.();
  };

  const close = async (action) => {
    setBusy(action);
    try {
      await opportunities.act(action, opportunityId, {});
      onChanged?.();
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const opp = data?.opportunity;
  const card = data?.card;

  return (
    <Dialog open={!!opportunityId} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-lg font-serif">
            {card?.formatted_address || 'Loading…'}
          </DialogTitle>
        </DialogHeader>

        {!data && !error && (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading this property…
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}

        {opp && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                {LISTING_STATUS_LABELS[card.listing_status_mapped] || 'Status unclear'}
              </span>
              {card.listing_status_raw && <span>Source status: “{card.listing_status_raw}”</span>}
              {card.status_review_required && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                  Check this status before relying on it
                </span>
              )}
              <OwnershipBadge status={card.match_status} reviewStatus={card.review_status} conflict={!!card.conflict_note} />
              {card.pending_date && <span>Pending {card.pending_date}</span>}
              {card.expected_closing_date && <span>Closing {card.expected_closing_date}</span>}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <OwnershipEvidence opportunity={opp} onUpdated={refresh} />
              <ServiceNeedPanel opportunity={opp} onUpdated={refresh} />
              <OpportunityTasks opportunity={opp} onUpdated={refresh} />
              <OutreachPanel opportunity={opp} onUpdated={refresh} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-500">
                Imported {String(card.imported_at || '').slice(0, 10) || 'unknown date'}
                {data.import?.source_label ? ` · ${data.import.source_label}` : ''}
                {data.import?.source_date ? ` · as of ${data.import.source_date}` : ''}
              </div>
              <AddressCorrection opportunity={opp} onUpdated={refresh} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => close('mark_handled')} disabled={!!busy} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark handled
              </Button>
              <Button size="sm" variant="outline" onClick={() => close('dismiss')} disabled={!!busy} className="gap-1.5 text-slate-600">
                <XCircle className="h-3.5 w-3.5" /> Dismiss
              </Button>
            </div>

            {(data.events || []).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Activity</h4>
                <div className="mt-2 space-y-1">
                  {data.events.map((event) => (
                    <p key={event.id} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{String(event.event_type).replace(/_/g, ' ')}</span>
                      {' · '}
                      {String(event.at || '').slice(0, 16).replace('T', ' ')}
                      {event.actor_name ? ` · ${event.actor_name}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}