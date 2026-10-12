// Phase 4D (Parts 4/6) — invitation acceptance. Public page reached from the
// "COMPLETE MY WEBSITE" email button. Fail-closed on expired / used /
// revoked / mismatched invitations. The user signs in with their EXISTING
// EstateSalen account (or creates one) — no separate LLBB login system.
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, PartyPopper, AlertCircle } from 'lucide-react';

export default function WebsiteInviteAccept() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [me, setMe] = useState(undefined); // undefined = checking
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.auth.me().then(u => { if (alive) setMe(u || null); }).catch(() => { if (alive) setMe(null); });
    if (token) {
      base44.functions.invoke('websiteCollab', { action: 'invitation_preview', token })
        .then(res => { if (alive) setInvite(res.data && res.data.invitation); })
        .catch(e => {
          const d = e.response && e.response.data && e.response.data.error;
          if (alive) setError(d ? (d.message || d.code) : 'This invitation link is not valid.');
        });
    } else if (alive) {
      setError('This invitation link is not valid.');
    }
    return () => { alive = false; };
  }, [token]);

  async function accept() {
    setAccepting(true); setAcceptError(null);
    try {
      const res = await base44.functions.invoke('websiteCollab', { action: 'accept_invitation', token });
      navigate(`/ClientWebsiteManager?tenant=${res.data.website.id}`);
    } catch (e) {
      const d = e.response && e.response.data && e.response.data.error;
      setAcceptError(d ? (d.message || d.code) : 'Could not accept this invitation.');
      setAccepting(false);
    }
  }

  if (me === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-w-md w-full p-8 text-center">
        {error ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <div className="font-heading text-lg font-bold text-slate-900">Invitation unavailable</div>
            <p className="text-sm text-slate-600 mt-2">{error}</p>
            <p className="text-xs text-slate-400 mt-4">Ask the EstateSalen team to send a fresh invitation if you still need access.</p>
          </>
        ) : !invite ? (
          <Loader2 className="w-7 h-7 animate-spin text-slate-400 mx-auto" />
        ) : (
          <>
            <PartyPopper className="w-10 h-10 text-cyan-600 mx-auto mb-3" />
            <div className="text-xs font-semibold tracking-widest text-cyan-700 uppercase">Your website is waiting</div>
            <h1 className="font-heading text-xl font-bold text-slate-900 mt-1">{invite.website_name}</h1>
            <p className="text-sm text-slate-600 mt-2">
              {invite.invited_by_name} invited you to finish the website for <strong>{invite.company_name}</strong>.
              We've already created it — review, polish and approve together.
            </p>
            {me ? (
              <div className="mt-6 space-y-3">
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" disabled={accepting} onClick={accept}>
                  {accepting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  COMPLETE MY WEBSITE
                </Button>
                {acceptError && <p className="text-sm text-red-600">{acceptError}</p>}
                <p className="text-xs text-slate-400">Signed in as {me.email}. This secure link works only for the invited email address.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)}>
                  Log in to continue
                </Button>
                <p className="text-xs text-slate-400">Use the account with the invited email address{invite.masked_email ? ` (${invite.masked_email})` : ''}. Don't have one yet? You can create it on the next screen.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}