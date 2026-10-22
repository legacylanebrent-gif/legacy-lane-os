import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Loader2, ShieldCheck, UploadCloud, Info, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { validateEligibilityResponse } from "@/lib/eligibilityResponse";

// Referral Rebuild Phase 2B — operator-facing INDIVIDUAL eligibility portal.
// The operator submits/corrects their OWN license & brokerage application
// through the sanctioned server function. Submission is NOT approval, and
// compensation stays unavailable during this build. Verified state is
// read-only here: only an authorized administrator can verify.
const STATUS_LABELS = {
  draft: "Not started",
  submitted: "Submitted — under review",
  under_review: "Under review",
  corrections_required: "Corrections requested",
  verified: "Verified",
  rejected: "Rejected",
  suspended: "Suspended",
  reverification_required: "Re-verification required",
};
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

export default function ReferralEligibility() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [effective, setEffective] = useState(null);
  const [compensationEnabled, setCompensationEnabled] = useState(false);
  const [missing, setMissing] = useState([]);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [form, setForm] = useState({
    legal_name: "", license_number: "", license_state: "", license_type: "",
    license_expiration: "", brokerage_name: "", brokerage_state: "",
    affiliation_attested: false, notes: "",
  });
  const [evidence, setEvidence] = useState([]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    try {
      const res = await base44.functions.invoke("referralEligibility", { action: "get" });
      const data = validateEligibilityResponse(res.data, "get");
      const p = data.profile;
      setProfile(p);
      setEffective(data.effective);
      setCompensationEnabled(data.compensation_enabled);
      const s = p?.self_submitted || {};
      setForm({
        legal_name: s.legal_name || "", license_number: s.license_number || "",
        license_state: s.license_state || "", license_type: s.license_type || "",
        license_expiration: s.license_expiration || "",
        brokerage_name: s.brokerage_name || "", brokerage_state: s.brokerage_state || "",
        affiliation_attested: s.affiliation_attested === true, notes: s.notes || "",
      });
      setEvidence(s.evidence_file_uris || []);
    } catch {
      setError("Could not load your eligibility profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      if (res?.file_uri) setEvidence((list) => [...list, res.file_uri]);
    } catch {
      setError("Could not upload that file. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSavedMsg(""); setMissing([]);
    setSaving(true);
    try {
      const res = await base44.functions.invoke("referralEligibility", {
        action: "submit",
        self_submitted: {
          ...form,
          license_expiration: form.license_expiration || null,
          evidence_file_uris: evidence,
        },
      });
      try {
        const data = validateEligibilityResponse(res.data, "submit");
        setProfile(data.profile);
        setEffective(data.effective);
        setSavedMsg(
          "Your application information was submitted. Submission is not approval — an administrator reviews it."
        );
        const s = data.profile?.self_submitted || {};
        setForm((f) => ({ ...f, affiliation_attested: s.affiliation_attested === true }));
      } catch (e) {
        if (e?.response?.data?.missing || e?.response?.data?.error === "incomplete_application") {
          setMissing(e.response.data.missing || []);
          setError("Please complete the highlighted fields before submitting.");
        } else {
          setError("Something went wrong saving your information. Nothing was saved — please try again.");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldMissing = (k) => missing.includes(k);
  const isVerifiedOrRev = ["verified", "reverification_required"].includes(profile?.status);

  if (loading) {
    return (
      <div className="flex items-center text-slate-500 p-8">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading your eligibility profile…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-cyan-600" /> Referral Eligibility
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit your real-estate license and brokerage information for review. Tracked introductions work without it — compensated referrals require a verified license.
        </p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <Info className="w-4 h-4 text-amber-600" />
        <div className="text-sm text-amber-900">
          <p><strong>Submitting is not approval.</strong> An administrator verifies applications; you'll see the outcome here.</p>
          {!compensationEnabled && (
            <p className="mt-1">
              <strong>Compensation is unavailable during this build.</strong> The referral compensation program remains disabled platform-wide while eligibility systems come online. Nothing on this page pays or promises anything.
            </p>
          )}
        </div>
      </Alert>

      {/* Status + verification outcome */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span>Application status</span>
            <Badge className={`${STATUS_TONE[profile?.status] || "bg-slate-100 text-slate-700"} border-0`}>
              {STATUS_LABELS[profile?.status] || profile?.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile?.status_reason && (
            <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{profile.status_reason}</span>
            </div>
          )}
          {profile?.verified?.verified_at && (
            <div className="border rounded-md p-3 bg-slate-50 space-y-1">
              <p className="flex items-center gap-1.5 font-medium text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verified by {profile.verified.reviewer_name || "an administrator"}
                <span className="text-slate-400 font-normal">
                  ({new Date(profile.verified.verified_at).toLocaleDateString()})
                </span>
              </p>
              <p className="text-slate-600">
                License status at verification: <strong>{(profile.verified.license_status || "unknown").replace("_", " ")}</strong>
                {profile.verified.brokerage_legal_name && <> · Brokerage: <strong>{profile.verified.brokerage_legal_name}</strong></>}
              </p>
              <p className="text-slate-600">
                Approved jurisdictions:{" "}
                <strong>{(profile.verified.approved_jurisdictions || []).join(", ") || "none recorded"}</strong>
              </p>
            </div>
          )}
          {effective && (
            <div className={`border rounded-md p-3 ${effective.eligible ? "bg-emerald-50 border-emerald-200" : "bg-slate-50"}`}>
              <p className="font-medium text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Effective eligibility today
              </p>
              <p className="text-slate-600 mt-0.5">
                {effective.eligible
                  ? "Your verified license is currently effective for compensated referral activity (which remains disabled platform-wide during this build)."
                  : "Not currently effective: " + effective.reasons.map((r) => r.code.replace(/_/g, " ")).join(", ")}
              </p>
            </div>
          )}
          {isVerifiedOrRev && (
            <p className="text-xs text-slate-500 border-t pt-2">
              Changing your license number, state, type, expiration, or brokerage below reopens verification — your prior verification is preserved in history.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Application form (applicant-settable fields only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your license & brokerage information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["legal_name", "Legal name *", "text", ""],
                ["license_number", "License number *", "text", ""],
                ["license_state", "License state *", "text", 2],
                ["brokerage_name", "Brokerage name *", "text", ""],
                ["brokerage_state", "Brokerage state", "text", 2],
                ["license_expiration", "License expiration", "date", ""],
              ].map(([k, label, type, maxLen]) => (
                <div key={k}>
                  <Label className={`text-xs ${fieldMissing(k) ? "text-red-600" : ""}`}>{label}</Label>
                  <Input
                    type={type}
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                    className={`h-9 mt-1 ${fieldMissing(k) ? "border-red-400" : ""}`}
                    maxLength={maxLen || undefined}
                  />
                </div>
              ))}
              <div>
                <Label className={`text-xs ${fieldMissing("license_type") ? "text-red-600" : ""}`}>License type *</Label>
                <Select value={form.license_type || ""} onValueChange={(v) => set("license_type", v)}>
                  <SelectTrigger className="h-9 mt-1 w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["salesperson", "broker", "broker_associate", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className={`text-xs ${fieldMissing("evidence_file_uris") ? "text-red-600" : ""}`}>
                License / brokerage evidence * (stored privately)
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <UploadCloud className="w-4 h-4 text-slate-500" />
                  {uploading ? "Uploading…" : "Upload file"}
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={uploadEvidence} disabled={uploading} />
                </label>
                <span className="text-xs text-slate-500">{evidence.length} file(s) attached</span>
              </div>
              {fieldMissing("evidence_file_uris") && (
                <p className="text-xs text-red-600 mt-1">At least one evidence file is required.</p>
              )}
            </div>

            <div>
              <Label className="text-xs">Notes for the reviewer</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="mt-1 min-h-16 text-sm"
                placeholder="Anything the reviewer should know about your license or brokerage affiliation…"
              />
            </div>

            <label className="flex items-start gap-2">
              <Checkbox
                checked={form.affiliation_attested}
                onCheckedChange={(v) => set("affiliation_attested", v === true)}
                className="mt-0.5"
              />
              <span className={`text-sm ${fieldMissing("affiliation_attested") ? "text-red-600" : "text-slate-700"}`}>
                I attest that I am currently affiliated with the brokerage named above. (Your own attestation — an administrator verifies it.)
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {savedMsg && (
              <p className="text-sm text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {savedMsg}
              </p>
            )}

            <Button type="submit" disabled={saving || uploading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              {saving ? "Submitting…" : "Submit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Immutable history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {(profile?.eligibility_history || []).length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ol className="space-y-3">
              {[...(profile.eligibility_history || [])].reverse().map((h, i) => (
                <li key={i} className="border-l-2 border-cyan-200 pl-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {(h.action || "").replace(/_/g, " ")}
                    {h.from_status !== h.to_status && (
                      <span className="text-slate-400 font-normal"> · {STATUS_LABELS[h.from_status] || h.from_status} → {STATUS_LABELS[h.to_status] || h.to_status}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(h.at).toLocaleString()} · by {h.by_name || "server"}
                  </p>
                  {h.reason && <p className="text-xs text-slate-600 mt-0.5">{h.reason}</p>}
                </li>
              ))}
            </ol>
          )}
          <p className="text-xs text-slate-400 mt-3">
            History is recorded by the system when actions happen — it cannot be edited from this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}