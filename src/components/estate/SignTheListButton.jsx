import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2, CheckCircle2 } from 'lucide-react';

export default function SignTheListButton({ saleId, saleTitle, user, onSuccess }) {
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const handleSignList = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setSigning(true);
    try {
      await base44.entities.EarlySignIn.create({
        sale_id: saleId,
        sale_title: saleTitle,
        user_email: user.email,
        user_name: user.full_name || user.email,
        signed_at: new Date().toISOString(),
      });
      setSigned(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error signing list:', error);
      alert('Could not sign the list. You may have already signed.');
    } finally {
      setSigning(false);
    }
  };

  if (signed) {
    return (
      <Button disabled className="w-full bg-green-600 hover:bg-green-700 gap-2">
        <CheckCircle2 className="w-4 h-4" />
        You've Signed the List
      </Button>
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