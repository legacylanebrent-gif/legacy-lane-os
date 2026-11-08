import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, Mail, Save, HeartHandshake } from 'lucide-react';
import {
  attendeeNames,
  buildThankYouMessage,
  buildThankYouSubject,
  saleScheduleText,
  saleAddressText,
} from './thankYouMessage';

const draftKey = (saleId) => `thankYouDraft:${saleId || 'sale'}`;

function defaultDraft(sale) {
  return {
    greeting: 'Hi neighbors,',
    body: `Thank you for coming out to ${sale?.title || 'our sale'}. We appreciate you spending part of your day with us, and so does the family we were able to help.`,
    nextSaleId: '',
    includeLink: true,
    signOff: sale?.company_name || sale?.operator_name || '',
  };
}

export default function PostSaleThankYouForm({ sale, checkins = [] }) {
  const attendees = useMemo(() => attendeeNames(checkins), [checkins]);
  const [draft, setDraft] = useState(() => defaultDraft(sale));
  const [nextSales, setNextSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(defaultDraft(sale));
    try {
      const stored = localStorage.getItem(draftKey(sale?.id));
      if (stored) setDraft((prev) => ({ ...prev, ...JSON.parse(stored) }));
    } catch {
      // an unreadable draft simply starts fresh
    }
  }, [sale?.id]);

  useEffect(() => {
    let active = true;
    const loadSales = async () => {
      const ownerId = sale?.operator_id || sale?.created_by_id;
      if (!ownerId) {
        setLoadingSales(false);
        return;
      }
      try {
        const res = await base44.entities.EstateSale.filter(
          { operator_id: ownerId, status: { $in: ['upcoming', 'active'] } },
          'sale_dates.date',
          50,
        );
        const list = Array.isArray(res) ? res : res?.items || [];
        if (active) setNextSales(list.filter((s) => s.id !== sale?.id));
      } catch (err) {
        console.error('Could not load upcoming sales:', err);
      } finally {
        if (active) setLoadingSales(false);
      }
    };
    loadSales();
    return () => { active = false; };
  }, [sale?.id]);

  const nextSale = nextSales.find((s) => s.id === draft.nextSaleId) || null;
  const message = buildThankYouMessage({ draft, nextSale, sale });
  const subject = buildThankYouSubject({ sale, nextSale });
  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${message}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(draftKey(sale?.id), JSON.stringify(draft));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Could not save draft:', err);
    }
  };

  const handleOpenEmail = () => {
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = href;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5" />
            Thank-You Message
          </CardTitle>
          <CardDescription>
            Draft a simple note for the {attendees.length} {attendees.length === 1 ? 'person' : 'people'} who
            checked in, and invite them to your next sale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thankyou-greeting">Greeting</Label>
            <Input
              id="thankyou-greeting"
              value={draft.greeting}
              onChange={(e) => set('greeting', e.target.value)}
              placeholder="Hi neighbors,"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thankyou-body">Message</Label>
            <Textarea
              id="thankyou-body"
              rows={5}
              value={draft.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Thank you for coming out to our sale…"
            />
          </div>

          <div className="space-y-2">
            <Label>Next sale to promote</Label>
            <Select
              value={draft.nextSaleId || 'none'}
              onValueChange={(v) => set('nextSaleId', v === 'none' ? '' : v)}
              disabled={loadingSales}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSales ? 'Loading your sales…' : 'Choose a sale'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No next sale</SelectItem>
                {nextSales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}{saleScheduleText(s) ? ` — ${saleScheduleText(s).split('\n')[0]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingSales && nextSales.length === 0 && (
              <p className="text-xs text-slate-500">
                No upcoming or active sales found on your schedule yet.
              </p>
            )}
            {nextSale && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-medium text-slate-700">{nextSale.title}</p>
                {saleScheduleText(nextSale) && <p className="whitespace-pre-line">{saleScheduleText(nextSale)}</p>}
                {saleAddressText(nextSale) && <p>{saleAddressText(nextSale)}</p>}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
              <Checkbox
                checked={draft.includeLink}
                onCheckedChange={(v) => set('includeLink', !!v)}
              />
              Include the sale page link in the message
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thankyou-signoff">Sign-off</Label>
            <Input
              id="thankyou-signoff"
              value={draft.signOff}
              onChange={(e) => set('signOff', e.target.value)}
              placeholder="Your name and company"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={handleCopy} className="bg-cyan-600 hover:bg-cyan-700">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied' : 'Copy message'}
            </Button>
            <Button variant="outline" onClick={handleOpenEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Open in email app
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              {saved ? 'Draft saved' : 'Save draft'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription className="break-words">Subject: {subject}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-line text-sm text-slate-700 leading-relaxed">
              {message || 'Your message will appear here.'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checked in ({attendees.length})</CardTitle>
            <CardDescription>People who scanned the sale QR code.</CardDescription>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <p className="text-sm text-slate-500">
                No QR check-ins were recorded for this sale, so this note can still be shared with your
                buyer audience.
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                {attendees.slice(0, 8).join(', ')}
                {attendees.length > 8 ? ` and ${attendees.length - 8} more` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}