import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Inbox, ShieldCheck, Megaphone } from "lucide-react";

// Phase 2B repair — three SEPARATE withdrawal actions, server-enforced:
// report_request (any staff tied to the consent) -> request recorded only;
// confirm_withdrawal (designated administrator only) -> consent state changes;
// propagate (designated administrator only) -> queued notices to the actual
// delivery recipients. Queued is never delivered. Reports never withdraw.

const emptyReport = { consent_id: "", channel: "", requester_identity: "",
  claimed_capacity: "", reference_note: "" };

export default function WithdrawalRelayPanel() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [canConfirm, setCanConfirm] = useState(false);
  const [report, setReport] = useState(emptyReport);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmFor, setConfirmFor] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ verification_method: "", verification_reference: "", representative_authority_verified: false });

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("withdrawSellerConsent", { action: "list" });
      setRequests(res.data?.requests || []);
      setCanConfirm(!!res.data?.can_confirm);
    } catch {
      setMsg("Could not load withdrawal requests.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const run = async (payload, okMsg) => {
    setBusy(true); setMsg("");
    try {
      const res = await base44.functions.invoke("withdrawSellerConsent", payload);
      if (res.data?.ok) { setMsg(okMsg); await load(); return true; }
      setMsg(`Action failed: ${res.data?.error || "unknown error"}`);
    } catch (e) {
      setMsg(e?.response?.data?.error ? `Action failed: ${e.response.data.error}` : "Action failed.");
    } finally { setBusy(false); }
    return false;
  };

  const submitReport = async () => {
    if (await run({ action: "report_request", ...report },
      "Request recorded only — the seller's consent is unchanged until a designated administrator confirms it.")) {
      setReport(emptyReport);
    }
  };

  const submitConfirm = async () => {
    if (!confirmFor) return;
    const ok = await run({ action: "confirm_withdrawal", consent_id: confirmFor.consent_id,
      request_id: confirmFor.id, verification_method: confirmForm.verification_method,
      verification_reference: confirmForm.verification_reference,
      representative_authority_verified: confirmForm.representative_authority_verified },
      "Withdrawal confirmed by a designated administrator. Queue recipient notices next.");
    if (ok) { setConfirmFor(null); setConfirmForm({ verification_method: "", verification_reference: "", representative_authority_verified: false }); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-600" /> Seller consent withdrawal relay
        </CardTitle>
        <p className="text-xs text-slate-500">
          A staff report is never seller authorization. Only a designated administrator verifies and confirms; queued notices are not delivery receipts.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report (staff) */}
        <div className="border rounded-md p-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Report a seller withdrawal request</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div><Label className="text-xs">Consent ID *</Label>
              <Input value={report.consent_id} onChange={(e) => setReport({ ...report, consent_id: e.target.value })}
                className="h-9 mt-1" placeholder="SC-…" /></div>
            <div><Label className="text-xs">Channel *</Label>
              <Input value={report.channel} onChange={(e) => setReport({ ...report, channel: e.target.value })}
                className="h-9 mt-1" placeholder="Phone, in person, email relay…" /></div>
            <div><Label className="text-xs">Requester (name) *</Label>
              <Input value={report.requester_identity} onChange={(e) => setReport({ ...report, requester_identity: e.target.value })}
                className="h-9 mt-1" /></div>
            <div><Label className="text-xs">Claimed capacity *</Label>
              <Input value={report.claimed_capacity} onChange={(e) => setReport({ ...report, claimed_capacity: e.target.value })}
                className="h-9 mt-1" placeholder="seller / executor / family member…" /></div>
          </div>
          <div><Label className="text-xs">Evidence / reference note (minimal — no private documents) *</Label>
            <Textarea value={report.reference_note} onChange={(e) => setReport({ ...report, reference_note: e.target.value })}
              className="mt-1 min-h-12 text-sm" /></div>
          <Button size="sm" variant="outline" disabled={busy} onClick={submitReport}>Record request</Button>
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="flex items-center text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-slate-500 flex items-center gap-2"><Inbox className="w-4 h-4" /> No withdrawal requests recorded.</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="border rounded-md p-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{r.consent_id}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge className="border-0 bg-slate-100 text-slate-700">{r.claimed_capacity}</Badge>
                    {r.confirmed
                      ? <Badge className="border-0 bg-emerald-50 text-emerald-700">withdrawal confirmed</Badge>
                      : <Badge className="border-0 bg-amber-50 text-amber-700">pending admin review</Badge>}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Received {new Date(r.request_received_at).toLocaleString()} via {r.channel} — reported by {r.actor_name}
                </p>
                <p className="text-xs text-slate-600">{r.reference_note}</p>
                {canConfirm && !r.confirmed && !confirmFor && (
                  <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => setConfirmFor(r)}>Verify & confirm…</Button>
                )}
                {confirmFor?.id === r.id && (
                  <div className="border-t pt-2 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><Label className="text-xs">Verification method *</Label>
                        <Input value={confirmForm.verification_method}
                          onChange={(e) => setConfirmForm({ ...confirmForm, verification_method: e.target.value })}
                          className="h-9 mt-1" placeholder="Callback to recorded seller number…" /></div>
                      <div><Label className="text-xs">Verification reference *</Label>
                        <Input value={confirmForm.verification_reference}
                          onChange={(e) => setConfirmForm({ ...confirmForm, verification_reference: e.target.value })}
                          className="h-9 mt-1" /></div>
                    </div>
                    {r.claimed_capacity && r.claimed_capacity.toLowerCase() !== "seller" && (
                      <label className="flex items-start gap-2 text-xs text-slate-700">
                        <input type="checkbox" className="mt-0.5"
                          checked={confirmForm.representative_authority_verified}
                          onChange={(e) => setConfirmForm({ ...confirmForm, representative_authority_verified: e.target.checked })} />
                        I verified this representative's authority to speak for the seller (required unless the requester IS the seller).
                      </label>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={busy} onClick={submitConfirm}>
                        Confirm withdrawal
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmFor(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
                {canConfirm && r.confirmed && (
                  <Button size="sm" variant="outline" disabled={busy}
                    onClick={() => run({ action: "propagate", consent_id: r.consent_id },
                      "Notices queued to the recorded delivery recipients. Queued is not delivered.")}>
                    <Megaphone className="w-4 h-4 mr-1" /> Queue recipient notices
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {msg && <p className="text-sm text-slate-700">{msg}</p>}
      </CardContent>
    </Card>
  );
}