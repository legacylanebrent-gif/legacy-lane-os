import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, X } from 'lucide-react';
import { DOC_CATEGORIES, DOC_SCOPES } from './documentModel';

// Upload + metadata modal for the vault. Create (with file) or edit metadata.
// All files go to PRIVATE storage; viewing happens only via short-lived
// signed URLs. Scope drives exactly one reference field — contradictory
// scope/reference combinations cannot be created here.
export default function DocumentUploadModal({ open, doc, operatorId, options, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setForm(doc ? {
      title: doc.title || '',
      category: doc.category || 'OTHER',
      policy_type: doc.policy_type || '',
      scope: doc.scope || 'business',
      sale_id: doc.sale_id || '',
      contact_id: doc.contact_id || '',
      team_member_id: doc.team_member_id || '',
      effective_date: (doc.effective_date || '').slice(0, 10),
      expiration_date: (doc.expiration_date || '').slice(0, 10),
      notes: doc.notes || '',
    } : {
      title: '', category: 'OTHER', policy_type: '', scope: 'business',
      sale_id: '', contact_id: '', team_member_id: '',
      effective_date: '', expiration_date: '', notes: '',
    });
  }, [open, doc]);

  if (!open || !form) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return alert('Give the document a name');
    if (!doc && !file) return alert('Choose a file to upload');
    setSaving(true);
    try {
      let fileUri = doc?.file_uri;
      let fileName = doc?.file_name;
      if (file) {
        const up = await base44.integrations.Core.UploadPrivateFile({ file });
        fileUri = up.file_uri;
        fileName = file.name;
      }
      const payload = {
        title: form.title.trim(),
        category: form.category,
        policy_type: form.category === 'POLICY' ? (form.policy_type || '').trim() : '',
        scope: form.scope,
        sale_id: form.scope === 'sale' ? form.sale_id : '',
        contact_id: form.scope === 'contact' ? form.contact_id : '',
        team_member_id: form.scope === 'team_member' ? form.team_member_id : '',
        effective_date: form.effective_date || null,
        expiration_date: form.expiration_date || null,
        notes: form.notes || '',
      };
      if (doc) {
        const updated = await base44.entities.BusinessDocument.update(doc.id, payload);
        onSaved(updated);
      } else {
        const me = await base44.auth.me();
        const created = await base44.entities.BusinessDocument.create({
          ...payload, operator_id: operatorId, file_uri: fileUri, file_name: fileName,
          uploaded_by: me?.id, version: 1,
        });
        onSaved(created);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert('Could not save the document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{doc ? 'Edit document' : 'Upload document'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        {!doc && (
          <div>
            <Label>File</Label>
            <input
              type="file" className="w-full text-sm border rounded-md p-2"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Stored privately — viewing uses short-lived authorized links only.</p>
          </div>
        )}

        <div>
          <Label>Document name</Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. General Liability Policy" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={form.scope} onValueChange={v => set('scope', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_SCOPES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {form.category === 'POLICY' && (
          <div>
            <Label>Policy type</Label>
            <Input value={form.policy_type} onChange={e => set('policy_type', e.target.value)} placeholder="e.g. Confidentiality Policy, Safety Policy" />
          </div>
        )}

        {form.scope === 'sale' && (
          <div>
            <Label>Sale</Label>
            <Select value={form.sale_id || undefined} onValueChange={v => set('sale_id', v)}>
              <SelectTrigger><SelectValue placeholder="Choose a sale" /></SelectTrigger>
              <SelectContent>
                {(options.sales || []).map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {form.scope === 'contact' && (
          <div>
            <Label>Contact / Client</Label>
            <Select value={form.contact_id || undefined} onValueChange={v => set('contact_id', v)}>
              <SelectTrigger><SelectValue placeholder="Choose a contact" /></SelectTrigger>
              <SelectContent>
                {(options.contacts || []).map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {form.scope === 'team_member' && (
          <div>
            <Label>Team member</Label>
            <Select value={form.team_member_id || undefined} onValueChange={v => set('team_member_id', v)}>
              <SelectTrigger><SelectValue placeholder="Choose a team member" /></SelectTrigger>
              <SelectContent>
                {(options.teamMembers || []).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Effective date</Label>
            <Input type="date" value={form.effective_date} onChange={e => set('effective_date', e.target.value)} />
          </div>
          <div>
            <Label>Expiration date</Label>
            <Input type="date" value={form.expiration_date} onChange={e => set('expiration_date', e.target.value)} />
            <p className="text-[10px] text-slate-400 mt-0.5">Leave blank if none is known.</p>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            {doc ? 'Save changes' : 'Upload document'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}