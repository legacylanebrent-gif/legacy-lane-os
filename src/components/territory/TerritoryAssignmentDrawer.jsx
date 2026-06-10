import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, User, Building2, Save, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

// Simple multi-select checkbox list
function MultiSelectList({ items, selectedIds, onToggle, labelKey, subLabelKey }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(item => {
    const label = (item[labelKey] || item.id || '').toLowerCase();
    return label.includes(search.toLowerCase());
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b bg-slate-50">
        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 text-sm"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No matches</p>
        )}
        {filtered.map(item => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-purple-50' : ''}`}
              onClick={() => onToggle(item.id, item)}
            >
              <Checkbox checked={isSelected} onCheckedChange={() => onToggle(item.id, item)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item[labelKey] || item.id}</p>
                {subLabelKey && item[subLabelKey] && (
                  <p className="text-xs text-slate-500 truncate">{item[subLabelKey]}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Selected chips display
function SelectedChips({ items, selectedIds, labelKey, onRemove }) {
  const selected = items.filter(i => selectedIds.includes(i.id));
  if (selected.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {selected.map(item => (
        <span key={item.id} className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-xs rounded-full px-2 py-0.5">
          {item[labelKey] || item.id}
          <button onClick={() => onRemove(item.id)} className="hover:text-purple-600 ml-0.5">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}

export default function TerritoryAssignmentDrawer({ territory, onClose, onSaved }) {
  const [tlRecord, setTlRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operators, setOperators] = useState([]);
  const [agents, setAgents] = useState([]);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    assigned_operator_ids: [],
    assigned_agent_ids: [],
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
      // Normalize state for matching — territory.state could be abbreviation or full name
      const stateVal = territory.state;

      const [tls, ops, allUsers] = await Promise.all([
        base44.entities.TerritoryLaunch.filter({ county: territory.county, state: stateVal }),
        // All operators in this state — no claim_status filter needed
        base44.entities.FutureEstateOperator.filter({ state: stateVal }, '-created_date', 300),
        // Get all CRM users — filter by role + state below
        base44.entities.User.list('-created_date', 500),
      ]);

      const tl = tls[0] || null;
      setTlRecord(tl);

      // Filter agents: primary_account_type = real_estate_agent AND address.state matches
      const stateUpper = stateVal?.toUpperCase();
      const agentUsers = allUsers.filter(u =>
        (u.role === 'real_estate_agent' || u.primary_account_type === 'real_estate_agent') &&
        u.address?.state?.toUpperCase() === stateUpper
      );

      // Normalize operators for display
      const normalizedOps = ops.map(op => ({
        ...op,
        _label: op.company_name || op.claim_contact_name || op.id,
        _sub: [op.city, op.state].filter(Boolean).join(', '),
      }));

      const normalizedAgents = agentUsers.map(ag => ({
        ...ag,
        _label: ag.full_name || ag.email,
        _sub: [ag.address?.city, ag.address?.state, ag.email].filter(Boolean).join(' · '),
      }));

      setOperators(normalizedOps);
      setAgents(normalizedAgents);

      if (tl) {
        setForm({
          assigned_operator_ids: tl.assigned_operator_ids || [],
          assigned_agent_ids: tl.assigned_agent_ids || [],
          fips_code: tl.fips_code || '',
          launch_status: tl.launch_status || 'draft',
        });
      } else {
        setForm({ assigned_operator_ids: [], assigned_agent_ids: [], fips_code: '', launch_status: 'draft' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleOperator = (id) => {
    setForm(f => ({
      ...f,
      assigned_operator_ids: f.assigned_operator_ids.includes(id)
        ? f.assigned_operator_ids.filter(x => x !== id)
        : [...f.assigned_operator_ids, id],
    }));
  };

  const toggleAgent = (id) => {
    setForm(f => ({
      ...f,
      assigned_agent_ids: f.assigned_agent_ids.includes(id)
        ? f.assigned_agent_ids.filter(x => x !== id)
        : [...f.assigned_agent_ids, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedOps = operators.filter(o => form.assigned_operator_ids.includes(o.id));
      const selectedAgs = agents.filter(a => form.assigned_agent_ids.includes(a.id));

      const payload = {
        assigned_operator_ids: form.assigned_operator_ids,
        assigned_operator_names: selectedOps.map(o => o._label),
        assigned_agent_ids: form.assigned_agent_ids,
        assigned_agent_names: selectedAgs.map(a => a._label),
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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
                <AlertCircle className="w-3 h-3" /> No record yet — will create on save
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

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            {/* Operators */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-slate-800 text-sm">Estate Sale Operators</span>
                  <span className="text-xs text-slate-400">({operators.length} in {territory?.state})</span>
                </div>
                {form.assigned_operator_ids.length > 0 && (
                  <span className="text-xs font-medium text-purple-600">{form.assigned_operator_ids.length} selected</span>
                )}
              </div>
              <MultiSelectList
                items={operators}
                selectedIds={form.assigned_operator_ids}
                onToggle={toggleOperator}
                labelKey="_label"
                subLabelKey="_sub"
              />
              <SelectedChips
                items={operators}
                selectedIds={form.assigned_operator_ids}
                labelKey="_label"
                onRemove={toggleOperator}
              />
            </div>

            {/* Agents */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-800 text-sm">Real Estate Agents</span>
                  <span className="text-xs text-slate-400">({agents.length} in {territory?.state})</span>
                </div>
                {form.assigned_agent_ids.length > 0 && (
                  <span className="text-xs font-medium text-purple-600">{form.assigned_agent_ids.length} selected</span>
                )}
              </div>
              {agents.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-3">No CRM users with agent role found in {territory?.state}.</p>
              ) : (
                <MultiSelectList
                  items={agents}
                  selectedIds={form.assigned_agent_ids}
                  onToggle={toggleAgent}
                  labelKey="_label"
                  subLabelKey="_sub"
                />
              )}
              <SelectedChips
                items={agents}
                selectedIds={form.assigned_agent_ids}
                labelKey="_label"
                onRemove={toggleAgent}
              />
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Assignments saved — PropStream importer will route to these assignees.
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