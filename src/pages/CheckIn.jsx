import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, MapPin, Calendar, Clock, Loader2 } from 'lucide-react';

export default function CheckIn() {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const saleId = params.get('saleId');
    if (saleId) {
      base44.entities.EstateSale.filter({ id: saleId })
        .then(res => { if (res.length > 0) setSale(res[0]); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');
      await base44.entities.CheckIn.create({
        sale_id: saleId,
        visitor_name: form.name,
        visitor_email: form.email,
        checked_in_at: new Date().toISOString(),
        check_in_method: 'qr_code',
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      // Still show success to not frustrate the visitor
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const saleDates = sale?.sale_dates?.[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-slate-100 p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">You're checked in!</h1>
          {sale && <p className="text-slate-600 mb-1 font-medium">{sale.title}</p>}
          <p className="text-slate-500 text-sm">Welcome — enjoy the sale!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">Estate Sale Check-In</p>
          <h1 className="text-xl font-bold leading-tight">{sale?.title || 'Welcome!'}</h1>
          {sale?.property_address && (
            <div className="flex items-center gap-1.5 mt-2 text-slate-300 text-sm">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{sale.property_address.city}, {sale.property_address.state}</span>
            </div>
          )}
          {saleDates && (
            <div className="flex items-center gap-3 mt-1 text-slate-300 text-sm">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{saleDates.date}</span>
              {saleDates.start_time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{saleDates.start_time}</span>}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <p className="text-sm text-slate-500">Enter your details to check in (optional):</p>

          <div className="space-y-1.5">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11 text-base font-semibold">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking in...</> : 'Check In'}
          </Button>

          <button
            type="button"
            onClick={() => setSubmitted(true)}
            className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
          >
            Skip — check in anonymously
          </button>
        </form>
      </div>
    </div>
  );
}