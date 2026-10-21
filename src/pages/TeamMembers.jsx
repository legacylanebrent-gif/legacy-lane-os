import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, Users, UserCog, Pencil, UserCheck, UserX, DollarSign } from 'lucide-react';
import TeamMemberModal from '@/components/businessdocs/TeamMemberModal';

// Chapter 6 P1 — the operator's worker/helper directory (people who work
// sales, whether or not they have a platform account). A directory, not an
// HRIS: see the TeamMemberModal for what is deliberately not stored.
export default function TeamMembers() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [modal, setModal] = useState({ open: false, member: null });

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const query = { operator_id: user.id };
      if (statusFilter !== 'ALL') query.status = statusFilter;
      if (search.trim()) query.name = { $regex: search.trim(), $options: 'i' };
      const res = await base44.entities.TeamMember.filter(query, { sort: 'name', limit: 500 });
      setMembers(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Platform-account options: users already on the operator's sale teams.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const sales = await base44.entities.EstateSale.filter({ operator_id: user.id });
        const ids = [...new Set((sales || []).flatMap(s => s.sale_team || []).filter(Boolean))];
        if (ids.length) {
          const users = await base44.entities.User.filter({ id: { $in: ids } });
          setPlatformUsers(Array.isArray(users) ? users : (users.items || []));
        }
      } catch { /* cosmetic — helper records work without an account link */ }
    })();
  }, [user]);

  const toggleStatus = async (m) => {
    try {
      await base44.entities.TeamMember.update(m.id, { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      await load();
    } catch {
      alert('Could not update the team member');
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-cyan-600" /> Team Members
          </h1>
          <p className="text-xs text-slate-500">Your worker directory — crew, helpers, and platform teammates. Used to pick workers and default rates on sale labor entries.</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setModal({ open: true, member: null })}>
          <Plus className="w-4 h-4 mr-1" /> Add team member
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</p>
      ) : members.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No team members yet. Add the people who work your sales — they don't need an account to be tracked.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {members.map(m => (
            <div key={m.id} className={`p-4 rounded-xl border bg-white ${m.status === 'INACTIVE' ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {m.name}
                    {m.user_id && <Badge className="ml-2 bg-cyan-100 text-cyan-700">Account linked</Badge>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{m.role || 'No role set'}</p>
                </div>
                <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'} className={m.status === 'ACTIVE' ? 'bg-green-600' : ''}>
                  {m.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.default_hourly_rate != null && (
                  <Badge variant="outline" className="bg-slate-50"><DollarSign className="w-3 h-3 mr-0.5" />{m.default_hourly_rate}/hr default</Badge>
                )}
                {(m.skills || []).map(s => <Badge key={s} variant="outline" className="bg-indigo-50">{s}</Badge>)}
              </div>
              {(m.phone || m.email) && (
                <p className="text-[11px] text-slate-400 mt-2">{[m.phone, m.email].filter(Boolean).join(' · ')}</p>
              )}
              {m.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.notes}</p>}
              <div className="flex gap-1.5 mt-3">
                <Button size="sm" variant="outline" onClick={() => setModal({ open: true, member: m })}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleStatus(m)}>
                  {m.status === 'ACTIVE' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {m.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeamMemberModal
        open={modal.open}
        member={modal.member}
        operatorId={user.id}
        platformUsers={platformUsers}
        onClose={() => setModal({ open: false, member: null })}
        onSaved={load}
      />
    </div>
  );
}