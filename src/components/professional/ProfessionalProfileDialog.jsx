import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  getProfile, displayName, categoryLabel, outcomeLabel, OUTCOME_OPTIONS,
} from "@/components/professional/professionalNetworkModel";
import ProfileForm from "@/components/professional/ProfileForm";
import ReferralLinkSection from "@/components/professional/ReferralLinkSection";

// One clear operator-private professional profile view: identity, profile
// facts, referral link/QR, and BOTH directions of referral history derived
// from canonical records (Chapter 10 deals inbound; Contact referral entries
// outbound). No duplicate truth.
export default function ProfessionalProfileDialog({
  contact, onClose, onSaved, onRecordReferral, onViewClientSummary,
}) {
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [inbound, setInbound] = useState(null);
  const [referredTo, setReferredTo] = useState(null);
  const [expNote, setExpNote] = useState("");
  const [expKind, setExpKind] = useState("fact");
  const [followUp, setFollowUp] = useState(
    contact.next_follow_up ? String(contact.next_follow_up).slice(0, 10) : ""
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await base44.entities.SaleConversionPipeline.filter(
          { referral_source_contact_id: contact.id }, { sort: "-created_date", limit: 50 });
        const b = await base44.entities.SaleConversionPipeline.filter(
          { referred_to_contact_id: contact.id }, { sort: "-created_date", limit: 50 });
        if (alive) {
          setInbound((a.items || a).map((d) => ({ id: d.id, client: d.client_name, stage: d.stage, revenue: d.actual_revenue, at: d.inquiry_received_at || d.created_date })));
          setReferredTo((b.items || b).map((d) => ({ id: d.id, client: d.client_name, stage: d.stage, at: d.referred_at || d.created_date })));
        }
      } catch { if (alive) { setInbound([]); setReferredTo([]); } }
    })();
    return () => { alive = false; };
  }, [contact.id]);

  const referrals = contact.professional_referrals || [];

  const updateReferral = async (referralId, patch) => {
    const next = referrals.map((r) => (r.referral_id === referralId ? { ...r, ...patch } : r));
    const updated = await base44.entities.Contact.update(contact.id, { professional_referrals: next });
    onSaved(updated);
  };

  const setOutcome = (r, outcome) => updateReferral(r.referral_id, { outcome, outcome_at: new Date().toISOString() });

  const addExperience = async () => {
    if (!expNote.trim()) return;
    const note = { note: expNote.trim(), kind: expKind, recorded_at: new Date().toISOString() };
    const target = referrals[referrals.length - 1];
    const next = referrals.map((r) =>
      r.referral_id === target.referral_id
        ? { ...r, experience: [...(r.experience || []), note] }
        : r);
    const updated = await base44.entities.Contact.update(contact.id, { professional_referrals: next });
    onSaved(updated);
    setExpNote("");
  };

  const saveFollowUp = async () => {
    const updated = await base44.entities.Contact.update(contact.id, {
      next_follow_up: followUp ? new Date(followUp).toISOString() : null,
    });
    onSaved(updated);
  };

  const HistoryList = ({ title, items }) => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1">{title}</p>
      {items === null ? (
        <div className="flex items-center text-xs text-slate-400 py-2"><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 py-2">None on record yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs border rounded px-2 py-1.5 bg-slate-50">
              <span className="font-medium text-slate-700 truncate">{d.client || "Unnamed"}</span>
              <span className="text-slate-500 shrink-0 ml-2">
                {d.stage} {d.revenue ? `· $${Number(d.revenue).toLocaleString()} revenue` : ""}
                {d.at ? ` · ${new Date(d.at).toLocaleDateString()}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displayName(contact)}</DialogTitle>
          <p className="text-xs text-slate-500">
            {contact.email || "No email"} {contact.phone ? `· ${contact.phone}` : ""}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs" onClick={() => onRecordReferral(contact)}>
              Record Referral / Introduction
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onViewClientSummary(contact)}>
              <FileText className="w-3.5 h-3.5 mr-1" /> Client Summary
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
            <TabsTrigger value="link" className="text-xs">Referral Link / QR</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History & Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-3">
            <ProfileForm contact={contact} onSaved={onSaved} saving={saving} setSaving={setSaving} />
          </TabsContent>

          <TabsContent value="link" className="mt-3">
            <ReferralLinkSection contact={contact} onSaved={onSaved} />
          </TabsContent>

          <TabsContent value="history" className="mt-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HistoryList title="Referrals FROM this professional (inbound)" items={inbound} />
              <HistoryList title="Seller opportunities referred TO this professional (Chapter 10)" items={referredTo} />
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">Outbound introductions (while helping a client)</p>
              {referrals.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">None recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {referrals.map((r) => (
                    <div key={r.referral_id} className="border rounded-md p-2 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {r.client_name} · {categoryLabel(r.service_category)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {r.referred_at ? new Date(r.referred_at).toLocaleDateString() : ""}
                            {r.next_follow_up ? ` · follow-up ${new Date(r.next_follow_up).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <select
                          className="text-xs rounded-md border border-slate-200 px-2 py-1 bg-white shrink-0"
                          value={r.outcome} onChange={(e) => setOutcome(r, e.target.value)}>
                          {OUTCOME_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </select>
                      </div>
                      {(r.experience || []).length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {r.experience.map((e, i) => (
                            <li key={i} className="text-[11px] text-slate-600">
                              <Badge className={`mr-1 text-[9px] ${e.kind === "fact" ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-purple-50 text-purple-800 border-purple-300"}`}>
                                {e.kind === "fact" ? "FACT/EVENT" : "OBSERVATION"}
                              </Badge>
                              {e.note}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {referrals.length > 0 && (
                <div className="mt-2 border rounded-md p-2 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    Add client-experience follow-up (private — never a public rating)
                  </p>
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    <select className="text-xs rounded-md border border-slate-200 px-2 py-1.5 bg-white shrink-0"
                      value={expKind} onChange={(e) => setExpKind(e.target.value)}>
                      <option value="fact">Fact / Event</option>
                      <option value="observation">Private Observation</option>
                    </select>
                    <Input value={expNote} onChange={(e) => setExpNote(e.target.value)} className="h-9 text-xs"
                      placeholder="e.g. Client reported provider responded same day." />
                    <Button size="sm" variant="outline" onClick={addExperience} className="shrink-0 h-9">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs font-semibold">Relationship follow-up (reuses Contact next-follow-up — no second reminder system)</Label>
              <div className="flex gap-2 mt-1">
                <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="h-9" />
                <Button size="sm" variant="outline" onClick={saveFollowUp} className="shrink-0 h-9">Save</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}