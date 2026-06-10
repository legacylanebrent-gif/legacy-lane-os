import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, User, Building2, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function TerritoryAssignmentDrawer({ territory, onClose, onSaved }) {
  const [tlRecord, setTlRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operators, setOperators] = useState([]);
  const [agents, setAgents] = useState([]);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    assigned_operator_id: '',
    assigned_operator_name: '',
    assigned_agent_id: '',
    assigned_agent_name: '',
    fips_code: '',
    launch_status: 'draft',
  });

  useEffect(() => {
    if (!territory) return;
    loadData();
  }, [territory]);

  const loadData = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const [tls, ops, ags] = await Promise.all([
        base44.entities.TerritoryLaunch.filter({ county: territory.county, state: territory.state }),
        base44.entities.FutureEstateOperator.filter({ claim_status: 'verified' }, '-created_date', 200),
        base44.entities.User.filter({ role: 'real_estate_agent' }, '-created_date', 200),
      ]);

      const tl = tls[0] || null;
      setTlRecord(tl);
      setOperators(ops);
      setAgents(ags);

      if (tl) {
        setForm({
          assigned_operator_id: tl.assigned_operator_id || '',
          assigned_operator_name: tl.assigned_operator_name || '',
          assigned_agent_id: tl.assigned_agent_id || '',
          assigned_agent_name: tl.assigned_agent_name || '',
          fips_code: tl.fips_code || '',
          launch_status: tl.launch_status || 'draft',
        });
      } else {
        setForm({
          assigned_operator_id: '',
          assigned_operator_name: '',
          assigned_agent_id: '',
          assigned_agent_name: '',
          fips_code: '',
          launch_status: 'draft',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOperatorSelect = (id) => {
    const op = operators.find(o => o.id === id);
    setForm(f => ({
      ...f,
      assigned_operator_id: id === 'none' ? '' : id,
      assigned_operator_name: op ? (op.company_name || `${op.claim_contact_name || ''}`.trim()) : '',
    }));
  };

  const handleAgentSelect = (id) => {
    const ag = agents.find(a => a.id === id);
    setForm(f => ({
      ...f,
      assigned_agent_id: id === 'none' ? '' : id,
      assigned_agent_name: ag ? ag.full_name : '',
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        assigned_operator_id: form.assigned_operator_id || null,
        assigned_operator_name: form.assigned_operator_name || null,
        assigned_agent_id: form.assigned_agent_id || null,
        assigned_agent_name: form.assigned_agent_name || null,
        fips_code: form.fips_code || null,
        launch_status: form.launch_status,
        county: territory.county,
        state: territory.state,
        state_slug: territory.state?.toLowerCase().replace(/\s+/g, '-') || '',
        county_slug: `${territory.county?.toLowerCase().replace(/\s+/g, '-')}-${territory.state?.toLowerCase()}` || '',
      };

      if (tlRecord) {
        await base44.entities.TerritoryLaunch.update(tlRecord.id, payload);
      } else {
        await base44.entities.TerritoryLaunch.create(payload);
      }
      setSaved(true);
      if (onSaved) onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!territory} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            {territory?.county}, {territory?.state}
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {territory?.status && (
              <Badge className="text-xs bg-slate-100 text-slate-600">{territory.status}</Badge>
            )}
            {tlRecord ? (
              <Badge className="text-xs bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> TerritoryLaunch linked
              </Badge>
            ) : (
              <Badge className="text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> No TerritoryLaunch record yet — will create on save
              </Badge>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">FIPS Code</Label>
              <Input
                value={form.fips_code}
                onChange={e => setForm(f => ({ ...f, fips_code: e.target.value }))}
                placeholder="e.g. 34003"
                className="font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Launch Status</Label>
              <Select value={form.launch_status} onValueChange={v => setForm(f => ({ ...f, launch_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-slate-800 text-sm">Estate Sale Operator</span>
              </div>
              <Select value={form.assigned_operator_id || 'none'} onValueChange={handleOperatorSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select operator..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {operators.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.company_name || op.claim_contact_name || op.id}
                      {op.city ? ` · ${op.city}, ${op.state}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.assigned_operator_id && (
                <p className="text-xs text-slate-500 mt-1">{form.assigned_operator_name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-slate-800 text-sm">Real Estate Agent</span>
              </div>
              <Select value={form.assigned_agent_id || 'none'} onValueChange={handleAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {agents.map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.full_name || ag.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.assigned_agent_id && (
                <p className="text-xs text-slate-500 mt-1">{form.assigned_agent_name}</p>
              )}
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Assignments saved — PropStream importer will now route to these assignees.
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Assignments
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}