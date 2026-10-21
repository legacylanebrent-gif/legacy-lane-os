import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SharedFooter from "@/components/layout/SharedFooter";
import { CheckCircle, Loader2 } from "lucide-react";

// Chapter 11 P1 — PUBLIC partner-attributed seller intake. The opaque prf
// token resolves the referring professional server-side; the seller never
// selects or types the referrer, sees no internal IDs, and grants no
// marketing consent. Each inquiry is its own inquiry (token = professional,
// never a single client).
export default function PartnerReferral() {
  const [partner, setPartner] = useState(null); // { name } | null
  const [checking, setChecking] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    city: "", county: "", state: "", zip_code: "", need_notes: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const token = React.useMemo(() => new URLSearchParams(window.location.search).get("prf") || "", []);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("resolvePartnerReferral", { token });
        if (res.data?.valid) {
          setPartner({ name: res.data.partner_display_name });
        } else {
          setInvalid(true);
        }
      } catch {
        setInvalid(true);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const token = new URLSearchParams(window.location.search).get("prf") || "";
      const res = await base44.functions.invoke("submitPartnerReferredInquiry", {
        token,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        county: form.county,
        state: form.state,
        zip_code: form.zip_code,
        need_notes: form.need_notes,
        source_url: window.location.href,
      });
      if (res.data?.ok) {
        setDone(true);
      } else {
        setError("Something went wrong submitting your inquiry. Please double-check your details and try again.");
      }
    } catch {
      setError("Something went wrong submitting your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-8">
        <p className="text-xs uppercase tracking-widest text-cyan-700 font-semibold">EstateSalen</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Welcome — let's get you help.</h1>

        {checking ? (
          <div className="flex items-center text-slate-500 mt-6">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Checking your referral…
          </div>
        ) : invalid ? (
          <div className="mt-6 border rounded-lg p-4 bg-white">
            <p className="font-medium text-slate-800">This referral link isn't valid.</p>
            <p className="text-sm text-slate-500 mt-1">
              Please contact the professional who shared it with you, or visit our home page to find help directly.
            </p>
            <a href="/" className="inline-block mt-3"><Button size="sm">Go to EstateSalen</Button></a>
          </div>
        ) : done ? (
          <div className="mt-6 border rounded-lg p-5 bg-emerald-50 border-emerald-200 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="font-semibold text-emerald-900 mt-2">Thank you{form.first_name ? `, ${form.first_name}` : ""}!</p>
            <p className="text-sm text-emerald-800 mt-1">
              Your inquiry has been received{partner ? ` via ${partner.name}` : ""}. The estate sale team will contact you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 border rounded-lg p-4 bg-white space-y-3">
            {partner && (
              <p className="text-sm text-cyan-800 bg-cyan-50 border border-cyan-200 rounded-md px-3 py-2">
                You were referred by <span className="font-semibold">{partner.name}</span> — no need to mention them; we'll take it from here.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First name *</Label>
                <Input required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">County</Label>
                <Input value={form.county} onChange={(e) => set("county", e.target.value)} className="h-9 mt-1" />
              </div>
              <div>
                <Label className="text-xs">State *</Label>
                <Input required value={form.state} onChange={(e) => set("state", e.target.value)} className="h-9 mt-1 uppercase" maxLength={2} placeholder="NJ" />
              </div>
              <div>
                <Label className="text-xs">ZIP</Label>
                <Input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} className="h-9 mt-1" maxLength={5} />
              </div>
            </div>
            <div>
              <Label className="text-xs">What do you need help with?</Label>
              <textarea value={form.need_notes} onChange={(e) => set("need_notes", e.target.value)}
                className="w-full text-sm rounded-md border border-slate-200 px-2 py-2 mt-1 h-20"
                placeholder="e.g. We need to empty and sell my mother's house…" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-11">
              {submitting ? "Sending…" : "Request Help"}
            </Button>
            <p className="text-[11px] text-slate-400 text-center">
              Submitting this form does not subscribe you to marketing emails.
            </p>
          </form>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}