import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky',
  'Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico',
  'New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
  'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming'
];

function scoreLead(data) {
  let score = 0;
  if (data.has_real_estate) score += 30;
  if (data.needs_estate_sale) score += 25;
  if (data.needs_realtor) score += 25;
  if (data.wants_cash_offer) score += 20;
  if (data.urgency_level === 'within_30_days') score += 20;
  if (data.phone) score += 10;
  return score;
}

export default function ProbateLeadForm({ sourceState = '', sourceCounty = '', sourcePage = '' }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    state: sourceState, county: sourceCounty, city: '', zip_code: '',
    relationship_to_deceased: '', stage_of_process: '',
    has_will: false, has_real_estate: false, needs_estate_sale: false,
    needs_cleanout: false, needs_realtor: false, wants_cash_offer: false,
    needs_attorney: false, property_address: '', urgency_level: '', notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggle = (k) => setForm(prev => ({ ...prev, [k]: !prev[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const score = scoreLead(form);
    await base44.entities.ProbateLead.create({
      ...form,
      lead_score: score,
      source_page: sourcePage,
      source_state: sourceState,
      source_county: sourceCounty,
      status: 'new'
    });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h3>
          <p className="text-green-700">We've received your information and will connect you with the right resources in your area shortly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        </div>
        <div>
          <Label>Phone</Label>
          <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div>
          <Label>State *</Label>
          <Select value={form.state} onValueChange={v => set('state', v)}>
            <SelectTrigger><SelectValue placeholder="Select state..." /></SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>County</Label>
          <Input value={form.county} onChange={e => set('county', e.target.value)} placeholder="e.g. Monmouth County" />
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <Label>ZIP Code</Label>
          <Input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} />
        </div>
        <div>
          <Label>Your Relationship to the Deceased</Label>
          <Select value={form.relationship_to_deceased} onValueChange={v => set('relationship_to_deceased', v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="spouse">Spouse</SelectItem>
              <SelectItem value="child">Child / Adult Child</SelectItem>
              <SelectItem value="sibling">Sibling</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="executor">Executor / Administrator</SelectItem>
              <SelectItem value="attorney">Attorney</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Where Are You in the Process?</Label>
          <Select value={form.stage_of_process} onValueChange={v => set('stage_of_process', v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="just_started">Just getting started</SelectItem>
              <SelectItem value="in_probate">Currently in probate</SelectItem>
              <SelectItem value="nearly_done">Nearly done with probate</SelectItem>
              <SelectItem value="not_sure">Not sure yet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>How Urgent Is Your Situation?</Label>
          <Select value={form.urgency_level} onValueChange={v => set('urgency_level', v)}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="within_30_days">Within 30 days</SelectItem>
              <SelectItem value="1_to_3_months">1–3 months</SelectItem>
              <SelectItem value="3_to_6_months">3–6 months</SelectItem>
              <SelectItem value="no_rush">No rush</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Property Address (if applicable)</Label>
        <Input value={form.property_address} onChange={e => set('property_address', e.target.value)} placeholder="123 Main St, City, State ZIP" />
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">What help do you need? (check all that apply)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'has_will', label: 'There is a will' },
            { key: 'has_real_estate', label: 'There is real estate involved' },
            { key: 'needs_estate_sale', label: 'Need an estate sale company' },
            { key: 'needs_cleanout', label: 'Need a cleanout / junk removal' },
            { key: 'needs_realtor', label: 'Need a realtor to sell the home' },
            { key: 'wants_cash_offer', label: 'Interested in a cash offer / investor' },
            { key: 'needs_attorney', label: 'Need a probate attorney referral' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 hover:bg-slate-100">
              <input
                type="checkbox"
                checked={form[key]}
                onChange={() => toggle(key)}
                className="rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Anything else you'd like us to know..." rows={3} />
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white text-lg py-3">
        {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Submitting...</> : 'Get Free Help & Resources'}
      </Button>

      <p className="text-xs text-slate-500 text-center">
        By submitting, you agree to be contacted by local estate sale companies, agents, and other service providers in our network.
      </p>
    </form>
  );
}