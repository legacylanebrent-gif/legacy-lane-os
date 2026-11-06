import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MapPin, Phone, Mail, Loader2, ArrowLeft } from "lucide-react";

const METHOD_OPTIONS = [
  ["call", "Phone call"],
  ["text", "Text message"],
  ["email", "Email"],
  ["in_person", "In person"],
  ["other", "Other"],
];

const OUTCOME_OPTIONS = [
  ["connected", "Spoke with the client"],
  ["left_message", "Left a message"],
  ["no_answer", "No answer"],
  ["wrong_number", "Wrong number"],
  ["declined", "Client declined help"],
  ["other", "Other"],
];

const labelOf = (options, value) => (options.find(([key]) => key === value) || [null, value])[1];

function localNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AgentReferralResponse() {
  const leadId = useMemo(() => new URLSearchParams(window.location.search).get("lead") || "", []);
  const [me, setMe] = useState(null);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    at: localNow(),
    method: "call",
    outcome: "connected",
    spoke_with: "",
    notes: "",
    agent_name: "",
  });

  useEffect(() => {
    base44.auth
      .me()
      .then((user) => {
        setMe(user);
        setForm((f) => ({ ...f, agent_name: user?.full_name || "" }));
      })
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!leadId) {
        setError("This link is missing the referral. Ask the referring company to resend it.");
        setLoading(false);
        return;
      }
      try {
        const res = await base44.functions.invoke("referralContactReport", { action: "get", lead_id: leadId });
        if (!active) return;
        setLead(res.data.lead);
      } catch (e) {
        if (active) setError(e?.response?.data?.error || "This referral could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [leadId]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("referralContactReport", {
        action: "report",
        lead_id: leadId,
        at: new Date(form.at).toISOString(),
        method: form.method,
        outcome: form.outcome,
        spoke_with: form.spoke_with,
        notes: form.notes,
        agent_name: form.agent_name,
      });
      setLead(res.data.lead);
      setSaved(true);
      setForm((f) => ({ ...f, at: localNow(), spoke_with: "", notes: "" }));
    } catch (e) {
      setError(e?.response?.data?.error || "Your report could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-slate-700">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const place = [lead.property_city, lead.property_state].filter(Boolean).join(", ");
  const attempts = lead.contact_attempts || [];

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">
        <span>Client referral</span>
        {place && <span className="text-slate-400">· {place}</span>}
      </div>

      <Card>
        <CardContent className="space-y-2 pt-5">
          <h1 className="font-serif text-xl font-bold text-slate-900">{lead.client_name}</h1>
          <p className="flex items-start gap-1.5 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            {[lead.property_address, place, lead.property_zip].filter(Boolean).join(", ")}
          </p>
          {lead.client_phone && (
            <a href={`tel:${lead.client_phone}`} className="flex items-center gap-1.5 text-sm font-medium text-cyan-700">
              <Phone className="h-3.5 w-3.5" /> {lead.client_phone}
            </a>
          )}
          {lead.client_email && (
            <a href={`mailto:${lead.client_email}`} className="flex items-center gap-1.5 text-sm font-medium text-cyan-700 break-all">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" /> {lead.client_email}
            </a>
          )}
          {lead.need_notes && <p className="text-sm text-slate-600">{lead.need_notes}</p>}
          {lead.submitted_by_name && (
            <p className="text-xs text-slate-500">Referred by {lead.submitted_by_name}</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <h2 className="font-serif text-base font-bold text-slate-900">Report your contact attempt</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Date &amp; time
            <input
              type="datetime-local"
              value={form.at}
              onChange={(e) => setForm({ ...form, at: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
              required
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            How you reached out
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {METHOD_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs font-medium text-slate-600">
          What happened
          <select
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {OUTCOME_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Who you spoke with
          <input
            type="text"
            value={form.spoke_with}
            onChange={(e) => setForm({ ...form, spoke_with: e.target.value })}
            placeholder="Client, spouse, family member, attorney…"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="What was discussed, next steps, when to follow up…"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Your name
          <input
            type="text"
            value={form.agent_name}
            onChange={(e) => setForm({ ...form, agent_name: e.target.value })}
            placeholder={me?.full_name || "Your name"}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        {saved && (
          <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Report sent — the referring company can see it.
          </p>
        )}

        <Button type="submit" disabled={saving} className="w-full bg-cyan-600 text-white hover:bg-cyan-700">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save contact report"}
        </Button>
      </form>

      {attempts.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Reported attempts ({attempts.length})
          </h2>
          <div className="space-y-2">
            {[...attempts].reverse().map((attempt) => (
              <div key={attempt.attempt_id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={attempt.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {labelOf(OUTCOME_OPTIONS, attempt.outcome)}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatWhen(attempt.at)}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {attempt.agent_name} · {labelOf(METHOD_OPTIONS, attempt.method)}
                </p>
                {attempt.spoke_with && <p className="text-xs text-slate-600">Spoke with {attempt.spoke_with}</p>}
                {attempt.notes && <p className="mt-1 text-sm text-slate-600">{attempt.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <a href="/" className="mt-6 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3 w-3" /> Back to EstateSalen
      </a>
    </div>
  );
}