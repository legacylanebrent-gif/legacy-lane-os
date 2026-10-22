import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Info, Ban, PauseCircle, CheckCircle2, Undo2, ListChecks } from "lucide-react";

// Referral Rebuild Phase 2B — ADMIN individual-eligibility review screen.
// Review submissions and evidence, approve/reject/suspend/request
// corrections, view immutable history, and see the separate global
// compensation-disabled status. Verification is written ONLY through the
// sanctioned admin server function (server-derived reviewer + timestamps).
const STATUS_TONE = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-50 text-blue-700",
  under_review: "bg-blue-50 text-blue-700",
  corrections_required: "bg-amber-50 text-amber-700",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  suspended: "bg-red-50 text-red-700",
  reverification_required: "bg-amber-50 text-amber-700",
};

export default function AdminReferralEligibility() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [compensationEnabled, setCompensationEnabled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState({
    verification_source: "state_registry",
    verification_reference: "",
    license_status: "active",
    brokerage_legal_name: "",
    approved_jurisdictions: "",
    agreement_references: "",
    note: "",
  });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await base44.functions.invoke("referralEligibilityAdmin", { action: "list" });
      setProfiles(res.data?.profiles || []);
      setCompensationEnabled(!!res.data?.compensation_enabled);
    } catch {
      setError("Could not load eligibility submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openProfile = (p) => {
    setSelected(p);
    setError("");
    setReason("");
    setReview({
      verification_source: "state_registry",
      verification_reference: "",
      license_status: "active",
      brokerage_legal_name: p.self_submitted?.brokerage_name || "",
      approved_jurisdictions: (p.verified?.approved_jurisdictions || []).join(", "),
      agreement_references: (p.verified?.agreement_references || []).join(", "),
      note: "",
    });
  };

  const runReview = async (reviewAction) => {
    if (!selected) return;
    if (["reject", "suspend", "request_corrections"].includes(reviewAction) && !reason.trim()) {
      setError("A factual reason is required for this action.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { action: "review", user_id: selected.user_id, review_action: reviewAction, reason: reason.trim() };
      if (reviewAction === "approve") {
        payload.verification = {
          verification_source: review.verification_source,
          verification_reference: review.verification_reference,
          license_status: review.license_status,
          brokerage_legal_name: review.brokerage_legal_name,
          approved_jurisdictions: review.approved_jurisdictions.split(",").map((s) => s.trim()).filter(Boolean),
          agreement_references: review.agreement_references.split(",").map((s) => s.trim()).filter(Boolean),
          note: review.note,
        };
      }
      const res = await base44.functions.invoke("referralEligibilityAdmin", payload);
      if (!res.data?.ok) {
        setError(res.data?.error === "reason_required"
          ? "A factual reason is required for this action."
          : `Action failed: ${res.data?.error || "unknown error"}`);
      } else {
        setSelected(null);
        await load();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const s = (p) => p.self_submitted || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-600" /> Referral Eligibility Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify individual license & brokerage submissions. Eligibility is per person — a company never becomes licensed because one member is.
          </p>
        </div>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <Info className="w-4 h-4 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p>
            <strong>Global compensation status: {compensationEnabled ? "ENABLED" : "DISABLED"}.</strong>{" "}
            Verification affects eligibility state only — it never activates payments. The referral compensation program stays {compensationEnabled ? "on" : "off"} independently of every approval below.
          </p>
        </div>
      </Alert>

      {loading ? (
        <div className="flex items-center text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading submissions…
        </div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-slate-500">
          No eligibility profiles yet. Operators submit from their Referral Eligibility page.
        </CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto bg-white">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2">Applicant</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">License</th>
                <th className="px-3 py-2">Brokerage</th>
                <th className="px-3 py-2">Effective today</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{s(p).legal_name || "(not submitted)"}</p>
                    <p className="text-xs text-slate-400">{p.user_id?.slice(0, 8)}…</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={`${STATUS_TONE[p.status] || "bg-slate-100 text-slate-700"} border-0`}>
                      {(p.status || "").replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {s(p).license_number ? `${s(p).license_number} (${s(p).license_state || "—"})` : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{s(p).brokerage_name || "—"}</td>
                  <td className="px-3 py-2">
                    {p.effective?.eligible ? (
                      <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {p.last_activity_at ? new Date(p.last_activity_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => openProfile(p)}>Review</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <span>Review: {s(selected).legal_name || "applicant"}</span>
                  <Badge className={`${STATUS_TONE[selected.status] || "bg-slate-100 text-slate-700"} border-0`}>
                    {(selected.status || "").replace(/_/g, " ")}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Submitted (unverified) information */}
              <div className="border rounded-md p-3 bg-slate-50 text-sm space-y-1">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Submitted information (applicant's claim — not verified)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p><strong>License:</strong> {s(selected).license_number || "—"} ({s(selected).license_state || "—"}, {(s(selected).license_type || "—").replace("_", " ")})</p>
                  <p><strong>Expires:</strong> {s(selected).license_expiration || "—"}</p>
                  <p><strong>Brokerage:</strong> {s(selected).brokerage_name || "—"} ({s(selected).brokerage_state || "—"})</p>
                  <p><strong>Affiliation attested:</strong> {s(selected).affiliation_attested ? "Yes" : "No"}</p>
                </div>
                <p><strong>Evidence:</strong> {s(selected).evidence_file_uris?.length || 0} private file(s) attached by the applicant</p>
                {s(selected).notes && <p><strong>Notes:</strong> {s(selected).notes}</p>}
              </div>

              {/* Verified block (server-written, read-only display) */}
              {selected.verified?.verified_at && (
                <div className="border rounded-md p-3 bg-emerald-50/50 text-sm space-y-1">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Verified by {selected.verified.reviewer_name || "administrator"} on {new Date(selected.verified.verified_at).toLocaleDateString()}</p>
                  <p><strong>License status at verification:</strong> {selected.verified.license_status}</p>
                  <p><strong>Brokerage (legal):</strong> {selected.verified.brokerage_legal_name || "—"}</p>
                  <p><strong>Jurisdictions:</strong> {(selected.verified.approved_jurisdictions || []).join(", ") || "none"}</p>
                  <p><strong>Source:</strong> {selected.verified.verification_source} ({selected.verified.verification_reference})</p>
                </div>
              )}

              {/* Verification inputs (approve path) */}
              <div className="border rounded-md p-3 space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4" /> Verification decision
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Verification source</Label>
                    <Select value={review.verification_source} onValueChange={(v) => setReview((r) => ({ ...r, verification_source: v }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["state_registry", "broker_confirmation", "document_review", "other"].map((v) => (
                          <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Verification reference</Label>
                    <Input value={review.verification_reference} onChange={(e) => setReview((r) => ({ ...r, verification_reference: e.target.value }))}
                      className="h-9 mt-1" placeholder="Registry lookup ref / confirmation id" />
                  </div>
                  <div>
                    <Label className="text-xs">License status at verification</Label>
                    <Select value={review.license_status} onValueChange={(v) => setReview((r) => ({ ...r, license_status: v }))}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["active", "inactive", "unknown"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Brokerage legal name (confirmed)</Label>
                    <Input value={review.brokerage_legal_name} onChange={(e) => setReview((r) => ({ ...r, brokerage_legal_name: e.target.value }))}
                      className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Approved jurisdictions (comma-separated states)</Label>
                    <Input value={review.approved_jurisdictions} onChange={(e) => setReview((r) => ({ ...r, approved_jurisdictions: e.target.value }))}
                      className="h-9 mt-1" placeholder="NJ, PA" />
                  </div>
                  <div>
                    <Label className="text-xs">Agreement references (comma-separated)</Label>
                    <Input value={review.agreement_references} onChange={(e) => setReview((r) => ({ ...r, agreement_references: e.target.value }))}
                      className="h-9 mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Verification note</Label>
                  <Textarea value={review.note} onChange={(e) => setReview((r) => ({ ...r, note: e.target.value }))} className="mt-1 min-h-12 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Reason (required for corrections / reject / suspend)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 min-h-12 text-sm"
                    placeholder="e.g. License number not found in the state registry — please re-upload evidence." />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy}
                    onClick={() => runReview("approve")}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & verify
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => runReview("request_corrections")}>
                    Request corrections
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" disabled={busy}
                    onClick={() => runReview("reject")}>
                    <Ban className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" disabled={busy}
                    onClick={() => runReview("suspend")}>
                    <PauseCircle className="w-4 h-4 mr-1" /> Suspend
                  </Button>
                  {selected.status === "suspended" && selected.verified?.verified_at && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => runReview("reinstate")}>
                      <Undo2 className="w-4 h-4 mr-1" /> Reinstate
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Approval requires complete application information and evidence. The effective eligibility start is set by the server at verification — never backdated.
                </p>
              </div>

              {/* Immutable history */}
              <div className="border rounded-md p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Immutable history</p>
                {(selected.eligibility_history || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No history entries.</p>
                ) : (
                  <ol className="space-y-2">
                    {[...(selected.eligibility_history || [])].reverse().map((h, i) => (
                      <li key={i} className="border-l-2 border-cyan-200 pl-3 text-sm">
                        <p className="font-medium text-slate-800">{(h.action || "").replace(/_/g, " ")}{h.from_status !== h.to_status && <span className="text-slate-400 font-normal"> · {h.from_status} → {h.to_status}</span>}</p>
                        <p className="text-xs text-slate-500">{new Date(h.at).toLocaleString()} · by {h.by_name || "server"}</p>
                        {h.reason && <p className="text-xs text-slate-600">{h.reason}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}