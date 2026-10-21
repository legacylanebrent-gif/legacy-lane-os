import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  AUTHORIZED_FIELD_OPTIONS, SERVICE_CATEGORIES, buildIntroductionText, displayName,
} from "@/components/professional/professionalNetworkModel";

// Who-Can-Help → select provider → record CLIENT AUTHORIZATION → prepare the
// MINIMUM-NECESSARY introduction → set follow-up → save the outbound referral
// on the professional's Contact record. The operator reviews and delivers;
// nothing is ever auto-sent.
export default function OutboundReferralDialog({ provider, onClose, onSaved }) {
  const [form, setForm] = useState({
    client_name: "", property_city: "", general_need: "", preferred_contact: "",
    brief_context: "", authorized_by_name: "", next_follow_up: "",
    service_category: (provider.professional_profile || {}).service_categories?.[0] || "other",
  });
  const [authorizedFields, setAuthorizedFields] = useState(["client_name", "general_need"]);
  const [introduction, setIntroduction] = useState("");
  const [introEdited, setIntroEdited] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleField = (key) => setAuthorizedFields((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const draft = useMemo(() => buildIntroductionText({
    providerName: (provider.professional_profile || {}).organization_name ||
      `${provider.first_name} ${provider.last_name}`.trim(),
    clientName: authorizedFields.includes("client_name") ? form.client_name : "",
    preferredContact: authorizedFields.includes("preferred_contact_method") ? form.preferred_contact : "",
    generalNeed: authorizedFields.includes("general_need") ? form.general_need : "",
    propertyCity: authorizedFields.includes("property_city") ? form.property_city : "",
    briefContext: authorizedFields.includes("brief_authorized_context") ? form.brief_context : "",
  }), [provider, form, authorizedFields]);

  useEffect(() => { if (!introEdited) setIntroduction(draft); }, [draft, introEdited]);

  const save = async () => {
    if (!form.client_name.trim()) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const entry = {
        referral_id: crypto.randomUUID(),
        client_name: form.client_name.trim(),
        client_contact_id: null,
        sale_id: null,
        operator_id: me?.id || null,
        service_category: form.service_category,
        referred_at: new Date().toISOString(),
        reason: form.general_need.trim() || null,
        authorized_context: {
          authorized_by_name: form.authorized_by_name.trim() || null,
          authorized_fields: authorizedFields,
          brief_context: authorizedFields.includes("brief_authorized_context") ? form.brief_context.trim() || null : null,
          authorized_at: new Date().toISOString(),
        },
        introduction_text: introduction || null,
        next_follow_up: form.next_follow_up ? new Date(form.next_follow_up).toISOString() : null,
        outcome: "INTRODUCED",
        outcome_at: new Date().toISOString(),
        outcome_notes: null,
        experience: [],
      };
      const updated = await base44.entities.Contact.update(provider.id, {
        professional_referrals: [...(provider.professional_referrals || []), entry],
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(introduction);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Referral / Introduction</DialogTitle>
          <p className="text-xs text-slate-500">{displayName(provider)}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Client name *</Label>
              <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Property city</Label>
              <Input value={form.property_city} onChange={(e) => set("property_city", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Service category</Label>
              <select className="w-full text-sm rounded-md border border-slate-200 px-2 py-2 mt-1 bg-white"
                value={form.service_category} onChange={(e) => set("service_category", e.target.value)}>
                {SERVICE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Next follow-up (optional)</Label>
              <Input type="date" value={form.next_follow_up}
                onChange={(e) => set("next_follow_up", e.target.value)} className="h-9 mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Client need / reason</Label>
            <textarea value={form.general_need} onChange={(e) => set("general_need", e.target.value)}
              className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5 mt-1 h-16" />
          </div>

          <div className="border rounded-md p-2 bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-900">Client authorization — what may be shared</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Minimum necessary only. Access codes, keys, financials, settlement, family matters, private notes, inventory, and documents are never included.
            </p>
            <div className="mt-2">
              <Label className="text-xs">Authorized by (client/authority name)</Label>
              <Input value={form.authorized_by_name} onChange={(e) => set("authorized_by_name", e.target.value)} className="h-9 mt-1 bg-white" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {AUTHORIZED_FIELD_OPTIONS.map((f) => (
                <button key={f.key} type="button" onClick={() => toggleField(f.key)}
                  className={`text-xs px-2 py-1 rounded-full border ${authorizedFields.includes(f.key)
                    ? "bg-amber-600 text-white border-amber-600" : "bg-white text-slate-600 border-slate-300"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {authorizedFields.includes("brief_authorized_context") && (
              <div className="mt-2">
                <Label className="text-xs">Brief authorized context (what the client agreed you may share)</Label>
                <textarea value={form.brief_context} onChange={(e) => set("brief_context", e.target.value)}
                  className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5 mt-1 h-14 bg-white" />
              </div>
            )}
            {authorizedFields.includes("preferred_contact_method") && (
              <div className="mt-2">
                <Label className="text-xs">Preferred contact method</Label>
                <Input value={form.preferred_contact} onChange={(e) => set("preferred_contact", e.target.value)} className="h-9 mt-1 bg-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Introduction (you review and deliver — never auto-sent)</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={copy}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <textarea value={introduction}
              onChange={(e) => { setIntroEdited(true); setIntroduction(e.target.value); }}
              className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5 mt-1 h-28" />
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">NO access codes</Badge>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">NO financials</Badge>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">NO private notes</Badge>
            </div>
          </div>

          <Button onClick={save} disabled={saving || !form.client_name.trim()} className="w-full">
            {saving ? "Saving…" : "Record Introduction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}