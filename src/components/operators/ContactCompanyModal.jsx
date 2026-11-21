import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, Mail } from 'lucide-react';

// Contact requests never go straight to the company. EstateSalen gets the lead
// and an admin makes the introduction.
export default function ContactCompanyModal({ operator, open, onClose, currentUser }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!open) return;
    setForm({
      name: currentUser?.full_name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      message: '',
    });
    setSent(false);
    setError('');
  }, [open, currentUser]);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Add your name and email so we can reach you.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await base44.functions.invoke('contactDirectoryCompany', {
        company_name: operator?.company_name || '',
        company_city: operator?.geocoded_city || operator?.city || '',
        company_state: operator?.state || '',
        company_phone: operator?.phone || '',
        company_email: operator?.email || '',
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setSent(true);
    } catch (e) {
      setError(e.message || 'Could not send that right now. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" /> Contact {operator?.company_name || 'this company'}
          </DialogTitle>
          <DialogDescription>
            We pass your request to the EstateSalen team, and we introduce you to the company.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <p className="text-slate-800 font-medium">Request sent to EstateSalen.</p>
            <p className="text-sm text-slate-600">Our team will introduce you to {operator?.company_name} and share your details with them.</p>
            <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-900">Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Your Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>What do you need? (optional)</Label>
              <Textarea rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Estate sale, cleanout, timeline..." />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={submit} disabled={sending} className="w-full bg-orange-600 hover:bg-orange-700">
              {sending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Sending...</> : 'Send to EstateSalen'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}