import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Calendar, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM',
];

function getNextDays(count) {
  const days = [];
  const now = new Date();
  let added = 0;
  let i = 1;
  while (added < count) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(d);
      added++;
    }
    i++;
  }
  return days;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ConsultationModal({ open, onClose }) {
  const [step, setStep] = useState(1); // 1=pick date, 2=pick time, 3=fill form, 4=confirmed
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [loading, setLoading] = useState(false);

  const days = getNextDays(10);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await base44.entities.Lead.create({
        first_name: form.name.split(' ')[0] || form.name,
        last_name: form.name.split(' ').slice(1).join(' ') || '',
        email: form.email,
        phone: form.phone,
        company_name: form.company,
        notes: `Sales consultation requested for ${selectedDate.toDateString()} at ${selectedTime}`,
        source: 'landing_page_oneday',
        status: 'new',
      });
    } catch (e) {
      // continue regardless
    }
    setLoading(false);
    setStep(4);
  };

  const reset = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setForm({ name: '', email: '', phone: '', company: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif font-bold text-slate-900">
            Schedule a Sales Consultation
          </DialogTitle>
        </DialogHeader>

        {step === 4 ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-bold text-slate-900">You're Confirmed!</h3>
            <p className="text-slate-600">
              We'll see you on <span className="font-semibold">{selectedDate?.toDateString()}</span> at <span className="font-semibold">{selectedTime}</span>.
            </p>
            <p className="text-slate-500 text-sm">A confirmation will be sent to {form.email}.</p>
            <Button onClick={reset} className="bg-orange-500 hover:bg-orange-600 text-white mt-2">Done</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Progress */}
            <div className="flex items-center gap-2">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-orange-500' : 'bg-slate-200'}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span>Pick a Date</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {days.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedDate(d); setStep(2); }}
                      className={`flex flex-col items-center py-3 rounded-lg border text-sm font-medium transition-all hover:border-orange-400 hover:bg-orange-50 ${selectedDate?.toDateString() === d.toDateString() ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-700'}`}
                    >
                      <span className="text-xs text-slate-400">{DAY_NAMES[d.getDay()]}</span>
                      <span className="font-bold text-base">{d.getDate()}</span>
                      <span className="text-xs text-slate-400">{MONTH_NAMES[d.getMonth()]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>Pick a Time — {selectedDate?.toDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedTime(t); setStep(3); }}
                      className={`py-2 rounded-lg border text-sm font-medium transition-all hover:border-orange-400 hover:bg-orange-50 ${selectedTime === t ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600 underline">← Change date</button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 bg-orange-50 border border-orange-100 rounded-lg px-4 py-2">
                  <span className="font-semibold">{selectedDate?.toDateString()}</span> at <span className="font-semibold">{selectedTime}</span>
                  <button onClick={() => setStep(2)} className="ml-2 text-orange-500 underline text-xs">Change</button>
                </p>
                <div className="space-y-3">
                  <div>
                    <Label>Your Name *</Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Smith" className="mt-1" />
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@yourcompany.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 000-0000" className="mt-1" />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Your Estate Sale Co." className="mt-1" />
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.email || loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3"
                >
                  {loading ? 'Confirming...' : 'Confirm My Consultation'}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}