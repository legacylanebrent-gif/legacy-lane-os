// Phase 4D (Parts 30/31/32) — collaborator access management for the Company
// owner (or platform admin): see who manages the website, remove a
// collaborator's website access, and revoke pending invitations. Membership,
// content, sales and leads are never deleted.
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Users, ShieldCheck, UserMinus, XCircle } from 'lucide-react';

export default function AccessPanel({ websiteTenantId, isOwnerOrAdmin, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('websiteCollab', { action: 'list_access', website_tenant_id: websiteTenantId });
      const invRes = await base44.functions.invoke('websiteCollab', { action: 'list_invitations', website_tenant_id: websiteTenantId });
      const pending = ((invRes.data && invRes.data.invitations) || []).filter(i => i.status === 'pending');
      setData({ ...res.data, pending_invitations: pending });
    } catch (e) { setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [websiteTenantId]); // eslint-disable-line

  async function revoke(userId, name) {
    setBusyId(userId);
    try {
      await base44.functions.invoke('websiteCollab', { action: 'revoke_access', website_tenant_id: websiteTenantId, user_id: userId });
      toast({ title: `${name || 'Collaborator'} no longer manages this website` });
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      toast({ title: 'Could not remove access', description: d ? (d.message || d.code) : null, variant: 'destructive' });
    }
    setBusyId(null);
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!data || !isOwnerOrAdmin) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="font-heading font-bold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4" /> Who manages this website</div>
        <ul className="divide-y divide-slate-100 mt-3">
          {(data.members || []).map(u => (
            <li key={u.id} className="py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[160px]">
                <div className="font-medium text-slate-900 text-sm">{u.full_name || u.email}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              {u.is_owner ? (
                <Badge className="bg-slate-900 text-white border border-slate-900"><ShieldCheck className="w-3 h-3 mr-1 inline" />Owner</Badge>
              ) : u.is_manager ? (
                <Badge className="bg-cyan-100 text-cyan-800 border border-cyan-200">Website Manager</Badge>
              ) : (
                <Badge variant="outline" className="bg-white">Company Member</Badge>
              )}
              {!u.is_owner && u.is_manager && (
                <Button variant="ghost" size="sm" disabled={busyId === u.id} onClick={() => revoke(u.id, u.full_name || u.email)}>
                  {busyId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5 mr-1" />} Remove Access
                </Button>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-3">Removing website access never deletes the person, your company, website content, sales or leads.</p>
      </div>

      {(data.pending_invitations || []).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="font-heading font-bold text-slate-900">Pending Invitations</div>
          <ul className="divide-y divide-slate-100 mt-2">
            {(data.pending_invitations || []).map(inv => (
              <li key={inv.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{inv.display_name || inv.email} <span className="text-slate-400 text-xs">· expires {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}</span></span>
                <Button variant="ghost" size="sm" onClick={async () => {
                  try {
                    await base44.functions.invoke('websiteCollab', { action: 'revoke_invitation', website_tenant_id: websiteTenantId, invitation_id: inv.id });
                    toast({ title: 'Invitation revoked' }); load();
                  } catch (e) { toast({ title: 'Could not revoke', variant: 'destructive' }); }
                }}><XCircle className="w-3.5 h-3.5 mr-1" /> Revoke</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}