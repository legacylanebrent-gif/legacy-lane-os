import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Upload } from 'lucide-react';

// Payment methods the operator can offer. The signs print exactly what is
// checked here, plus the QR codes uploaded below.
export const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' }, { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit/Debit Card' }, { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' }, { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' }, { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'stripe', label: 'Stripe' }, { value: 'square', label: 'Square' },
  { value: 'other', label: 'Other' },
];

// QR images the operator uploads once and reuses on every payment sign.
// Apple Pay has no QR of its own — customers tap their phone, so it only
// needs the accepted-method checkbox above.
export const QR_FIELDS = [
  { field: 'venmo_qr_code', label: 'Venmo QR Code' },
  { field: 'zelle_qr_code', label: 'Zelle QR Code' },
  { field: 'cashapp_qr_code', label: 'Cash App QR Code' },
];

export default function PaymentSettingsTab({ form, setForm, toggleArr, handleUpload, uploading, saveButton }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Accepted Payment Methods</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                <Checkbox checked={form.payment_methods_accepted.includes(opt.value)} onCheckedChange={() => toggleArr('payment_methods_accepted', opt.value)} />
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Apple Pay and Cash App are paid by the customer on their own phone — check them here and they print on your payment signs.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Account Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Venmo Username</Label><Input value={form.venmo_username} onChange={e => setForm(p => ({ ...p, venmo_username: e.target.value }))} placeholder="@YourVenmo" /></div>
            <div><Label>PayPal Email</Label><Input value={form.paypal_email} onChange={e => setForm(p => ({ ...p, paypal_email: e.target.value }))} placeholder="paypal@email.com" type="email" /></div>
            <div><Label>Zelle Phone or Email</Label><Input value={form.zelle_phone_or_email} onChange={e => setForm(p => ({ ...p, zelle_phone_or_email: e.target.value }))} placeholder="(555) 123-4567 or email" /></div>
            <div><Label>Cash App Tag</Label><Input value={form.cashapp_tag} onChange={e => setForm(p => ({ ...p, cashapp_tag: e.target.value }))} placeholder="$YourCashTag" /></div>
            <div><Label>Stripe Account ID</Label><Input value={form.stripe_account_id} onChange={e => setForm(p => ({ ...p, stripe_account_id: e.target.value }))} placeholder="acct_xxxxxxxxxxxx" /></div>
            <div><Label>Square Location ID</Label><Input value={form.square_location_id} onChange={e => setForm(p => ({ ...p, square_location_id: e.target.value }))} placeholder="Square location ID" /></div>
          </div>
          <div className="pt-4 border-t grid md:grid-cols-2 gap-5">
            {QR_FIELDS.map(({ field, label }) => (
              <div key={field}>
                <Label className="mb-2 block">{label}</Label>
                <div className="flex items-start gap-4">
                  {form[field] && (
                    <img src={form[field]} alt={label} className="w-28 h-28 object-contain border rounded-lg p-2 bg-white" />
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild>
                        <span><Upload className="w-4 h-4 mr-2" />{uploading[field] ? 'Uploading...' : form[field] ? 'Change QR' : 'Upload QR Code'}</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(field, e.target.files[0])} disabled={uploading[field]} />
                    </label>
                    {form[field] && <Button variant="ghost" size="sm" className="text-red-500 ml-2" onClick={() => setForm(p => ({ ...p, [field]: '' }))}>Remove</Button>}
                    <p className="text-xs text-slate-400 mt-1">Printed on payment signs for customers to scan</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {saveButton}
    </div>
  );
}