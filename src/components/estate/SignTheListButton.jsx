import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignTheListButton({ saleId, saleTitle, user, onSuccess, earlySignInEnabled = true }) {
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [position, setPosition] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user || !saleId) { setChecking(false); return; }
    // Check if already signed
    base44.entities.EarlySignIn.filter({ sale_id: saleId, user_email: user.email })
      .then(existing => {
        if (existing.length > 0) {
          setSigned(true);
          // Figure out position by getting all signers sorted
          return base44.entities.EarlySignIn.filter({ sale_id: saleId }, 'signed_at', 500)
            .then(all => {
              const idx = all.findIndex(s => s.user_email === user.email);
              if (idx !== -1) setPosition(idx + 1);
            });
        }
      })
      .finally(() => setChecking(false));
  }, [user, saleId]);

  const handleSignList = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setSigning(true);
    try {
      // Double-check not already signed
      const existing = await base44.entities.EarlySignIn.filter({ sale_id: saleId, user_email: user.email });
      if (existing.length > 0) {
        const all = await base44.entities.EarlySignIn.filter({ sale_id: saleId }, 'signed_at', 500);
        const idx = all.findIndex(s => s.user_email === user.email);
        if (idx !== -1) setPosition(idx + 1);
        setSigned(true);
        return;
      }

      await base44.entities.EarlySignIn.create({
        sale_id: saleId,
        sale_title: saleTitle,
        user_email: user.email,
        user_name: user.full_name || user.email,
        signed_at: new Date().toISOString(),
      });

      // Get position number
      const all = await base44.entities.EarlySignIn.filter({ sale_id: saleId }, 'signed_at', 500);
      const idx = all.findIndex(s => s.user_email === user.email);
      setPosition(idx !== -1 ? idx + 1 : all.length);

      setSigned(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error signing list:', error);
    } finally {
      setSigning(false);
    }
  };

  if (!earlySignInEnabled) {
    return (
      <Button disabled className="w-full bg-red-600 gap-2 cursor-not-allowed opacity-90">
        <ClipboardList className="w-4 h-4" />
        Sorry, No Early Sign In Allowed
      </Button>
    );
  }

  if (checking) {
    return (
      <Button disabled className="w-full bg-cyan-600 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (signed) {
    return (
      <div className="space-y-1">
        <Button disabled className="w-full bg-green-600 hover:bg-green-700 gap-2">
          <CheckCircle2 className="w-4 h-4" />
          You've Signed the List
        </Button>
        {position && (
          <p className="text-center text-sm font-semibold text-green-700">
            🎉 You are #{position} on the list!
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleSignList}
      disabled={signing}
      className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2"
    >
      {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
      {signing ? 'Signing...' : 'Sign the List for First Entry'}
    </Button>
  );
}