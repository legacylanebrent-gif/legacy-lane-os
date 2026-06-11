import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Mail, MessageSquare, Users, MapPin, AlertCircle, CheckCircle2, Loader2, Copy, ChevronDown, ChevronUp } from 'lucide-react';

const SMS_COST = 0.05;

// Haversine distance miles (client-side estimate)
function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PublishEventModal({ event, radiusMiles, onConfirm, onCancel }) {
  const [includeSms, setIncludeSms] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showEmailCopy, setShowEmailCopy] = useState(false);
  const [showSmsCopy, setShowSmsCopy] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    estimateReach();
  }, []);

  const estimateReach = async () => {
    setLoadingEstimate(true);
    try {
      const allResellers = await base44.entities.ResellerProfile.filter({
        is_active: true,
        lead_notifications_enabled: true,
        geocode_status: 'geocoded',
      });

      // Filter by radius if event has lat/lng resolved from zip
      let count = allResellers.length;
      if (event?.zip) {
        try {
          const geoRes = await base44.functions.invoke('geocodeZip', { zip: event.zip });
          const { lat, lng } = geoRes?.data || {};
          if (lat && lng) {
            count = allResellers.filter(r =>
              r.lat && r.lng && distanceMiles(lat, lng, r.lat, r.lng) <= radiusMiles
            ).length;
          }
        } catch { /* fallback to total */ }
      }

      setRegisteredCount(count);
    } catch {
      setRegisteredCount(0);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const smsCost = registeredCount ? (registeredCount * SMS_COST).toFixed(2) : '0.00';

  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD';
  const location = `${event?.city || ''}, ${event?.state || ''}`.trim().replace(/^,\s*/, '');
  const saleLink = `${window.location.origin}/ResellerPackupEvents`;

  const emailScript = `Subject: Private Reseller Event – ${event?.event_title || 'Post-Sale Inventory Pickup'}

Hi [Name],

I wanted to reach out personally — I'm hosting a private reseller pack-up event after our recent estate sale and thought you'd be a great fit.

📦 Event: ${event?.event_title || 'Reseller Pack-Up Event'}
📅 Date: ${eventDate}
📍 Location: ${location}
🔗 View Details & RSVP: ${saleLink}

Spots are limited and require registration. If you're not already in our reseller network, there's a free trial option to get started at no cost.

Let me know if you have any questions!

[Your Name]`;

  const smsScript = `Hi [Name], I'm hosting a private reseller pack-up event in ${location} on ${eventDate}. Limited spots — view details & RSVP here: ${saleLink} (Free trial available if not registered)`;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm({ include_sms: includeSms });
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-5 my-auto">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Publish Reseller Event</h2>
          <p className="text-sm text-slate-500 mt-1">Review your reach before sending notifications.</p>
        </div>

        {/* Radius reach count */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-4">
          <div className="bg-purple-100 rounded-full p-2">
            <Users className="w-5 h-5 text-purple-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-900">Registered Resellers in Your Radius</p>
            {loadingEstimate
              ? <p className="text-xs text-purple-600 flex items-center gap-1 mt-0.5"><Loader2 className="w-3 h-3 animate-spin" /> Checking database...</p>
              : <p className="text-sm mt-0.5 text-purple-800">
                  <span className="text-2xl font-bold">{registeredCount}</span>
                  <span className="text-xs ml-2">active resellers within {radiusMiles} miles will be auto-notified</span>
                </p>
            }
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 text-xs text-purple-600">
            <MapPin className="w-3 h-3" />
            {radiusMiles} mi
          </div>
        </div>

        {/* Free auto notifications */}
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800"><Mail className="w-3 h-3 inline mr-1" />Email Notification — FREE</p>
              <p className="text-xs text-green-700 mt-0.5">All {registeredCount ?? '...'} eligible resellers receive an automated email invite.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800"><Users className="w-3 h-3 inline mr-1" />In-App Notification — FREE</p>
              <p className="text-xs text-green-700 mt-0.5">Resellers see this event in their dashboard feed immediately.</p>
            </div>
          </div>
        </div>

        {/* SMS blast toggle */}
        <div className={`p-3 border rounded-lg ${includeSms ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-4 h-4 ${includeSms ? 'text-purple-700' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">SMS Text Blast — <span className="text-purple-700">$0.05/reseller</span></p>
                <p className="text-xs text-slate-500">Direct text to each reseller with a phone on file</p>
              </div>
            </div>
            <Switch checked={includeSms} onCheckedChange={setIncludeSms} />
          </div>
          {includeSms && (
            <div className="mt-3 bg-purple-100 border border-purple-200 rounded p-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800">
                Estimated cost: <strong>${smsCost}</strong> for up to {registeredCount} SMS. Resellers without a phone are skipped.
              </p>
            </div>
          )}
        </div>

        {/* Personal outreach tools */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Personal Outreach (for contacts not in the network)</p>
          </div>

          {/* Email copy */}
          <div className="border-b border-slate-100">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setShowEmailCopy(v => !v)}
            >
              <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" /> Copy Email Script</span>
              {showEmailCopy ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showEmailCopy && (
              <div className="px-4 pb-4 space-y-2">
                <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">{emailScript}</pre>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleCopy(emailScript, 'email')}>
                  <Copy className="w-3 h-3" />
                  {copied === 'email' ? '✓ Copied!' : 'Copy to Clipboard'}
                </Button>
              </div>
            )}
          </div>

          {/* SMS copy */}
          <div>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setShowSmsCopy(v => !v)}
            >
              <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-500" /> Copy Text Message Script</span>
              {showSmsCopy ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showSmsCopy && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-xs text-slate-500">Ready to paste into any messaging app or your contacts list:</p>
                <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap font-sans leading-relaxed">{smsScript}</pre>
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handleCopy(smsScript, 'sms')}>
                  <Copy className="w-3 h-3" />
                  {copied === 'sms' ? '✓ Copied!' : 'Copy to Clipboard'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={confirming}>Cancel</Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleConfirm}
            disabled={confirming || loadingEstimate}
          >
            {confirming
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</>
              : includeSms
                ? `Publish + SMS ($${smsCost})`
                : `Publish & Notify ${registeredCount !== null ? `(${registeredCount} resellers)` : ''}`
            }
          </Button>
        </div>
      </div>
    </div>
  );
}