import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle, AlertTriangle } from "lucide-react";

const EMPTY = {
  first_name: "",
  last_name: "",
  client_email: "",
  client_phone: "",
  property_address: "",
  property_city: "",
  property_state: "",
  property_zip: "",
  county: "",
  timeline: "unknown",
  need_notes: "",
};

const TIMELINES = [
  { value: "unknown", label: "Not stated" },
  { value: "within_30_days", label: "Within 30 days" },
  { value: "one_to_three_months", label: "1 to 3 months" },
  { value: "three_to_six_months", label: "3 to 6 months" },
  { value: "six_plus_months", label: "6+ months" },
];

export default function ClientReferralForm({ onSubmitted }) {
  const [form, setForm] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!form.first_name.trim() && !form.last_name.trim()) return setError("Enter the client's name.");
    if (!form.property_address.trim() || !form.property_city.trim() || !form.property_state.trim()) {
      return setError("Enter the property address, city and state.");
    }
    if (!form.client_email.trim() && !form.client_phone.trim()) {
      return setError("Add a client email or phone so agents can reach them.");
    }
    if (!consent) return setError("Confirm the client agreed to share their information with agents.");

    setBusy(true);
    try {
      const res = await base44.functions.invoke("submitClientReferral", {
        client_name: `${form.first_name} ${form.last_name}`.trim(),
        client_email: form.client_email,
        client_phone: form.client_phone,
        property_address: form.property_address,
        property_city: form.property_city,
        property_state: form.property_state,
        property_zip: form.property_zip,
        county: form.county,
        timeline: form.timeline,
        need_notes: form.need_notes,
        share_consent: consent,
      });
      if (res.data?.ok) {
        setResult(res.data);
        setForm(EMPTY);
        setConsent(false);
        onSubmitted?.();
      } else {
        setError(res.data?.error || "The referral could not be submitted. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.error || "The referral could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-emerald-900">
            <CheckCircle className="h-4 w-4" /> Referral saved as a lead for agents
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {result.note || "The referral was saved."}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Client</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="client_email">Client email</Label>
            <Input id="client_email" type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="client_phone">Client phone</Label>
            <Input id="client_phone" value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Property</p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="property_address">Street address</Label>
            <Input id="property_address" value={form.property_address} onChange={(e) => set("property_address", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="property_city">City</Label>
            <Input id="property_city" value={form.property_city} onChange={(e) => set("property_city", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="property_state">State</Label>
              <Input
                id="property_state"
                value={form.property_state}
                maxLength={2}
                onChange={(e) => set("property_state", e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label htmlFor="property_zip">ZIP</Label>
              <Input id="property_zip" value={form.property_zip} onChange={(e) => set("property_zip", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="county">County</Label>
            <Input id="county" value={form.county} onChange={(e) => set("county", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="timeline">Client timeline</Label>
            <select
              id="timeline"
              value={form.timeline}
              onChange={(e) => set("timeline", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TIMELINES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="need_notes">What does the client need?</Label>
            <Textarea
              id="need_notes"
              rows={3}
              value={form.need_notes}
              onChange={(e) => set("need_notes", e.target.value)}
              placeholder="Downsizing after a move, inherited home, needs a listing agent and cleanout…"
            />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          The client agreed that their information may be shared with real estate agents serving this city.
        </span>
      </label>

      {error && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Submit referral
      </Button>
    </form>
  );
}