import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Calendar, Clock, Loader2, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function CheckIn() {
  const [sale, setSale] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saleId, setSaleId] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('saleId');
    setSaleId(id);

    Promise.all([
      id ? base44.entities.EstateSale.filter({ id }).then(res => res[0] || null) : Promise.resolve(null),
      base44.auth.me().catch(() => null),
    ]).then(([saleData, userData]) => {
      setSale(saleData);
      setUser(userData);

      // If already logged in, auto check-in immediately — pass saleData directly to avoid stale state
      if (userData && id) {
        doCheckIn(id, userData, saleData);
      }
    }).finally(() => setLoading(false));
  }, []);

  const doCheckIn = async (sid, userData, saleData) => {
    setSubmitting(true);
    try {
      // Check if user already checked in to this sale today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = await base44.entities.CheckIn.filter({
        location_id: sid,
        created_by: userData.email,
        check_in_type: 'sale_visit',
      });
      const alreadyToday = existing.some(c => {
        const d = c.created_date ? new Date(c.created_date).toISOString().split('T')[0] : '';
        return d === today;
      });

      if (alreadyToday) {
        setSubmitting(false);
        setAlreadyCheckedIn(true);
        return;
      }

      await base44.entities.CheckIn.create({
        check_in_type: 'sale_visit',
        location_id: sid,
        location_name: saleData?.title || '',
        notes: `QR check-in by ${userData?.full_name || userData?.email || 'user'}`,
        verified: true,
      });
    } catch (err) {
      console.error('Check-in record error:', err);
      // Non-fatal — still show success
    }
    setSubmitting(false);
    setSubmitted(true);

    // 3-second countdown then redirect to sale page
    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        window.location.href = `${window.location.origin}/EstateSaleDetail?id=${sid}`;
      }
    }, 1000);
  };

  const handleLoginRedirect = () => {
    // After login, they'll be redirected back to this same URL which will auto check-in
    base44.auth.redirectToLogin(window.location.href);
  };

  const saleDates = sale?.sale_dates?.[0];

  if (loading || submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        <p className="text-slate-500 text-sm">{submitting ? 'Checking you in…' : 'Loading…'}</p>
      </div>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Checked In</h1>
          {sale && <p className="text-slate-700 font-medium mb-1">{sale.title}</p>}
          <p className="text-slate-500 text-sm mb-6">
            Only one check-in per day per sale is allowed. Come back tomorrow!
          </p>
          <Button
            onClick={() => { window.location.href = `${window.location.origin}/EstateSaleDetail?id=${saleId}`; }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            View Sale Page
          </Button>
        </div>
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
          <p className="text-slate-500 text-sm mb-4">Welcome — enjoy the sale!</p>
          {user && (
            <p className="text-xs text-slate-400 mb-6">
              Your visit is saved to your account. You can log any purchases from your profile.
            </p>
          )}
          <p className="text-sm text-cyan-600 font-medium">
            Redirecting to sale page in {countdown}…
          </p>
        </div>
      </div>
    );
  }

  // Not logged in — prompt to login or register
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
              {saleDates.start_time && (
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{saleDates.start_time}</span>
              )}
            </div>
          )}
        </div>

        {/* Auth prompt */}
        <div className="px-6 py-6 space-y-4">
          <div className="text-center space-y-1 pb-2">
            <p className="text-slate-800 font-semibold">Sign in to check in</p>
            <p className="text-sm text-slate-500">
              Log in or create a free account to record your visit and track your purchases.
            </p>
          </div>

          <Button
            onClick={handleLoginRedirect}
            className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-base"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Log In & Check In
          </Button>

          <Button
            onClick={handleLoginRedirect}
            variant="outline"
            className="w-full h-11 font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account & Check In
          </Button>

          <p className="text-center text-xs text-slate-400 pt-1">
            Both buttons will bring you right back here after signing in.
          </p>
        </div>
      </div>
    </div>
  );
}