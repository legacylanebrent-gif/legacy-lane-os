import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const FIELDS = [
  ['company_name', 'Company Name', 'text'],
  ['owner_name', 'Owner Name', 'text'],
  ['phone', 'Phone', 'text'],
  ['email', 'Email', 'text'],
  ['website', 'Website', 'text'],
  ['city', 'City', 'text'],
  ['state', 'State', 'text'],
  ['zip_code', 'ZIP Code', 'text'],
  ['county', 'County', 'text'],
  ['profile_url', 'ES.org Profile URL', 'text'],
  ['source_url', 'ES.net Profile URL', 'text'],
  ['facebook', 'Facebook URL', 'text'],
  ['instagram', 'Instagram URL', 'text'],
  ['about_text', 'About / Notes', 'textarea'],
];

export default function DirectoryRecordEdit({ record, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setForm(record ? { ...record } : null); setError(''); }, [record]);

  if (!record || !form) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const patch = {};
      for (const [key] of FIELDS) {
        if (form[key] !== record[key]) patch[key] = form[key] ?? '';
      }
      if (Object.keys(patch).length > 0) {
        await base44.entities.MasterOperatorDirectory.update(record.id, patch);
      }
      onSaved && onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Save failed — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update the record's core fields</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {FIELDS.map(([key, label, type]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`edit-${key}`} className="text-xs text-slate-500">{label}</Label>
              {type === 'textarea' ? (
                <textarea
                  id={`edit-${key}`}
                  rows={3}
                  value={form[key] || ''}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <Input
                  id={`edit-${key}`}
                  value={form[key] || ''}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}