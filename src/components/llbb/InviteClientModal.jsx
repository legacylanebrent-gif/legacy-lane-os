// Phase 4D (Part 3) — admin action: INVITE CLIENT.
// Name, email, Company and Website are fixed to the tenant being managed
// (the invitation is Company-bound + tenant-bound by construction — the
// server derives company_id from the tenant, so it can never bind elsewhere).
// Role is website manager; expiry selectable. The raw single-use link is
// shown once so the admin can share it manually if email delivery fails.
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Loader2, UserPlus, Copy, MailCheck, MailWarning, CheckCircle2 } from 'lucide-react';

const EXPIRY_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days (recommended)' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' }
];

export default function InviteClientModal({ open, onClose, tenantId, companyName, websiteName, onInvited }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const invite = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('websiteCollab', {
        action: 'invite_client', website_tenant_id: tenantId,
        display_name: name.trim(), email: email.trim(), expires_in_days: days
      });
      setResult(res.data);
      if (onInvited) onInvited();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      toast({ title: 'Could not send invitation', description: d ? (d.message || d.code) : null, variant: 'destructive' });
    }
    setBusy(false);
  };

  const reset = () => { setName(''); setEmail(''); setDays(14); setResult(null); };
  const close = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite Client</DialogTitle></DialogHeader>
        {!result ? (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm space-y-1">
              <div><span className="text-slate-400 text-xs">Company</span><div className="text-slate-800 font-medium">{companyName}</div></div>
              <div><span className="text-slate-400 text-xs">Website</span><div className="text-slate-800 font-medium">{websiteName}</div></div>
              <div><span className="text-slate-400 text-xs">Access granted</span><div className="text-slate-800">Website management — they can finish the website, but never change company ownership or technical settings.</div></div>
            </div>
            <div className="space-y-1">
              <Label>Client Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
              <p className="text-xs text-slate-400">If this person already has an EstateSalen account with this email, their existing account is used — no duplicate identity.</p>
            </div>
            <div className="space-y-1">
              <Label>Invitation Expires</Label>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white">
                {EXPIRY_OPTIONS.map(o => <option key={o.days} value={o.days}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={close}>Cancel</Button>
              <Button size="sm" disabled={busy || !email.trim()} onClick={invite}>
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
                Send Invitation
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 text-sm ${result.invitation.email_sent ? 'text-green-700' : 'text-amber-700'}`}>
              {result.invitation.email_sent
                ? <><MailCheck className="w-4 h-4" /> Invitation email sent to {result.invitation.email}.</>
                : <><MailWarning className="w-4 h-4" /> Email delivery failed ({result.invitation.email_error}). Share the secure link below manually.</>}
            </div>
            <div className="space-y-1">
              <Label>Secure invitation link (single-use, expires {result.invitation.expires_at ? new Date(result.invitation.expires_at).toLocaleDateString() : '—'})</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.invite_url} className="text-xs" onFocus={(e) => e.target.select()} />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(result.invite_url); toast({ title: 'Link copied' }); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> When your client accepts, they land on their own website dashboard — never inside EstateSalen admin.
            </div>
            <div className="flex justify-end"><Button size="sm" onClick={close}>Done</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}