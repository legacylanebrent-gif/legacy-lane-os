import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Send, CheckCircle, Building2, Mail, Phone, MapPin, Loader2 } from 'lucide-react';

export default function PortalInviteTab({ user }) {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', email: '', phone: '', city: '', state: '', notes: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition-colors bg-white";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      // Save as a FutureOperatorLead with source = 'agent_invite'
      await base44.entities.FutureOperatorLead.create({
        company_name: form.company_name,
        owner_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        source: 'agent_invite',
        lead_stage: 'invited_by_agent',
        notes: `Invited by agent${user?.full_name ? ' ' + user.full_name : ''}${user?.email ? ' (' + user.email + ')' : ''}. ${form.notes}`.trim(),
        created_at: new Date().toISOString(),
      });

      // Send notification email via platform integration
      if (form.email) {
        await base44.integrations.Core.SendEmail({
          to: form.email,
          subject: `You've Been Invited to Join EstateSalen.com`,
          body: `Hi ${form.contact_name || form.company_name},\n\n${user?.full_name || 'A real estate agent partner'} has personally invited your estate sale company to join EstateSalen.com — a platform built specifically for estate sale professionals.\n\nAs a platform member, you'll get:\n• A dedicated company profile and sale listing tools\n• Access to the Legacy Lane OS lead system\n• Marketing support and AI-powered content tools\n• Referral partnership tools with trusted local agents\n\nGet started at: https://estatesalen.com\n\nIf you have questions, reply to this email or reach out directly to ${user?.full_name || 'your agent partner'}.\n\nWarm regards,\nThe EstateSalen.com Team`,
        });
      }

      setSent(true);
      setForm({ company_name: '', contact_name: '', email: '', phone: '', city: '', state: '', notes: '' });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid md:grid-cols-5 gap-6">
      {/* Form */}
      <div className="md:col-span-3">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Invite an Estate Sale Operator</h3>
                <p className="text-xs text-slate-500">They'll receive a personalized invitation email and be added to your pipeline.</p>
              </div>
            </div>

            {sent && (
              <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-emerald-800 font-semibold text-sm">Invitation Sent!</p>
                  <p className="text-emerald-700 text-xs">The operator has been emailed and added to your invite pipeline.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Company Name *</label>
                  <input required className={inputCls} placeholder="ABC Estate Sales" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Contact Name</label>
                  <input className={inputCls} placeholder="Jane Smith" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input required type="email" className={inputCls + " pl-9"} placeholder="jane@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input className={inputCls + " pl-9"} placeholder="(555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input className={inputCls + " pl-9"} placeholder="Orlando" value={form.city} onChange={e => set('city', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} placeholder="FL" maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Personal Note (optional)</label>
                  <textarea rows={3} className={inputCls} placeholder="Add a personal message to include with the invitation..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              <Button type="submit" disabled={sending} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending Invitation…' : 'Send Invitation'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Info panel */}
      <div className="md:col-span-2 space-y-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-5">
            <h4 className="font-bold text-orange-900 mb-2 text-sm">Why Invite Operators?</h4>
            <ul className="space-y-2 text-xs text-orange-800 leading-relaxed">
              <li className="flex gap-2"><span className="font-bold shrink-0">→</span> They become your official referral partner on the platform</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">→</span> You earn 20% of their monthly subscription as a Territory Owner</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">→</span> Shared lead routing flows automatically between you</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">→</span> Your profile appears in their consultation packets</li>
              <li className="flex gap-2"><span className="font-bold shrink-0">→</span> Track all shared activity from this portal</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <h4 className="font-bold text-slate-800 mb-2 text-sm">What Happens Next</h4>
            <ol className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <li className="flex gap-2"><span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">1</span> Operator receives a personalized invitation email</li>
              <li className="flex gap-2"><span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">2</span> They register and set up their company profile</li>
              <li className="flex gap-2"><span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">3</span> Platform links them to your agent account</li>
              <li className="flex gap-2"><span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 font-bold shrink-0 text-xs">4</span> Referral pipeline and analytics activate automatically</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}