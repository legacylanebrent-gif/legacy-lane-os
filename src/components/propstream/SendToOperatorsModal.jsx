import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader, CheckCircle, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SendToOperatorsModal({ open, listing, onClose, onSent }) {
  const [operators, setOperators] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || !listing) return;
    setSelected([]);
    setDone(false);
    loadOperators();
  }, [open, listing]);

  const loadOperators = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list();
      const ops = allUsers.filter(u =>
        u.primary_account_type === 'estate_sale_operator' ||
        u.account_types?.includes('estate_sale_operator')
      );
      // prioritize matched Estate Sale Company Owners
      const matched = new Set(listing?.matched_operator_ids || []);
      ops.sort((a, b) => (matched.has(b.id) ? 1 : 0) - (matched.has(a.id) ? 1 : 0));
      setOperators(ops);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSend = async () => {
    setSending(true);
    await base44.functions.invoke('sendPropstreamListingToOperators', { listing, operator_ids: selected });
    setSending(false);
    setDone(true);
    onSent && onSent();
  };

  const matched = new Set(listing?.matched_operator_ids || []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Lead to Estate Sale Company Owners</DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-lg text-slate-800">Sent to {selected.length} Estate Sale Company Owner{selected.length !== 1 ? 's' : ''}!</p>
            <p className="text-slate-500 text-sm mt-1">{listing?.property_address}</p>
            <Button className="mt-5" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-slate-800">{listing?.property_address}</p>
              <p className="text-slate-500">{listing?.city}, {listing?.state} · Score: {listing?.estate_sale_score} ({listing?.estate_sale_score_label})</p>
              <p className="text-slate-500">Territory: {listing?.territory_name || 'Not matched'}</p>
            </div>

            <p className="text-sm font-medium text-slate-700">Select Estate Sale Company Owners to notify:</p>

            {loading ? (
              <div className="py-6 text-center"><Loader className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
            ) : operators.length === 0 ? (
              <div className="py-6 text-center text-slate-400"><Users className="w-8 h-8 mx-auto mb-2" /><p>No Estate Sale Company Owners found</p></div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {operators.map(op => (
                  <label key={op.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.includes(op.id) ? 'bg-purple-50 border-purple-300' : 'hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selected.includes(op.id)} onChange={() => toggle(op.id)} className="accent-purple-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{op.company_name || op.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{op.email}</p>
                    </div>
                    {matched.has(op.id) && <Badge className="bg-green-100 text-green-700 text-xs shrink-0">Territory Match</Badge>}
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-3 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSend} disabled={selected.length === 0 || sending} className="bg-purple-600 hover:bg-purple-700">
                {sending ? <><Loader className="w-4 h-4 animate-spin mr-2" />Sending…</> : `Send to ${selected.length} Estate Sale Company Owner${selected.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}