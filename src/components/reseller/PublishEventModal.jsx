import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Mail, MessageSquare, Users, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const SMS_COST = 0.05;

export default function PublishEventModal({ event, radiusMiles, onConfirm, onCancel }) {
  const [includeSms, setIncludeSms] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [twilioReady, setTwilioReady] = useState(false);

  useEffect(() => {
    estimateReach();
  }, []);

  const estimateReach = async () => {
    setLoadingEstimate(true);
    try {
      // Count active geocoded resellers with notifications enabled
      const resellers = await base44.entities.ResellerProfile.filter({
        is_active: true,
        lead_notifications_enabled: true,
        geocode_status: 'geocoded'
      });

      // Client-side radius filter approximation (proper haversine done server-side on send)
      // For the estimate we just show total eligible resellers as upper bound
      setEstimatedCount(resellers.length);

      // Check if Twilio is likely configured by calling a lightweight check
      // We'll just show the option and let the backend report twilio_configured
      setTwilioReady(true); // show the option; backend will handle gracefully
    } catch {
      setEstimatedCount(0);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const smsCost = estimatedCount ? (estimatedCount * SMS_COST).toFixed(2) : '0.00';

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm({ include_sms: includeSms });
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Publish Reseller Event</h2>
          <p className="text-sm text-slate-500 mt-1">Choose how to notify resellers when this event goes live.</p>
        </div>

        {/* Reach estimate */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800">Estimated Reach</p>
            {loadingEstimate
              ? <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Calculating...</p>
              : <p className="text-xs text-slate-500">
                  Up to <span className="font-semibold text-slate-700">{estimatedCount}</span> active resellers within <span className="font-semibold">{radiusMiles} miles</span>
                </p>
            }
          </div>
        </div>

        {/* Free: Email */}
        <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-green-700" />
              <p className="text-sm font-semibold text-green-800">Email Notification — FREE</p>
            </div>
            <p className="text-xs text-green-700 mt-0.5">All eligible resellers in your radius will receive an email invite automatically.</p>
          </div>
        </div>

        {/* Free: In-app */}
        <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-700" />
              <p className="text-sm font-semibold text-green-800">In-App Notification — FREE</p>
            </div>
            <p className="text-xs text-green-700 mt-0.5">Resellers will see this event in their dashboard and notification feed.</p>
          </div>
        </div>

        {/* Paid: SMS */}
        <div className={`p-3 border rounded-lg ${includeSms ? 'border-purple-300 bg-purple-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-4 h-4 ${includeSms ? 'text-purple-700' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">SMS Text Blast — <span className="text-purple-700">$0.05/reseller</span></p>
                <p className="text-xs text-slate-500">Direct text message to each reseller's phone</p>
              </div>
            </div>
            <Switch checked={includeSms} onCheckedChange={setIncludeSms} />
          </div>
          {includeSms && (
            <div className="mt-3 bg-purple-100 border border-purple-200 rounded p-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-800">
                Estimated cost: <strong>${smsCost}</strong> for up to {estimatedCount} SMS messages.
                You will be billed before the event publishes. Resellers without a phone on file are skipped.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={confirming}>Cancel</Button>
          <Button
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={handleConfirm}
            disabled={confirming || loadingEstimate}
          >
            {confirming
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</>
              : includeSms
                ? `Publish + Send SMS ($${smsCost})`
                : 'Publish & Notify (Free)'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}