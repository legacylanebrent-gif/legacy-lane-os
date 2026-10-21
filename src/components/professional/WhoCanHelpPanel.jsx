import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Plus, RotateCcw } from "lucide-react";
import {
  SERVICE_CATEGORIES, categoryLabel, matchProviders, providerReasons,
  getProfile, displayName, serviceAreaSummary,
} from "@/components/professional/professionalNetworkModel";

export default function WhoCanHelpPanel({
  contacts, onRecordReferral, onViewProfile, onViewClientSummary, onAddProfessional,
}) {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [category, setCategory] = useState(urlParams.get("category") || "");
  const [state, setState] = useState(urlParams.get("state") || "");
  const [county, setCounty] = useState(urlParams.get("county") || "");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");

  const result = useMemo(() => {
    if (!category) return null;
    return matchProviders(contacts, { category, state, county, zip });
  }, [contacts, category, state, county, zip]);

  const hasLocation = Boolean(state.trim() || county.trim() || zip.trim());

  const ProviderCard = ({ item }) => {
    const c = item.contact;
    const p = getProfile(c);
    const extraReasons = providerReasons(p);
    return (
      <div className="border rounded-lg p-3 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{displayName(c)}</p>
            <p className="text-xs text-slate-500">{c.email || "No email"} {c.phone ? `· ${c.phone}` : ""}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.reasons.map((r) => (
                <Badge key={r} className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">{r}</Badge>
              ))}
              {extraReasons.map((r) => (
                <Badge key={r} className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">{r}</Badge>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-1.5">{serviceAreaSummary(p)}</p>
            {(p.limitations || {}).does_not_handle?.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Does NOT handle: {p.limitations.does_not_handle.join(", ")}
              </p>
            )}
            {p.fit_notes && (
              <p className="text-xs text-slate-600 mt-1 border-l-2 border-slate-300 pl-2">
                <span className="font-semibold">Private operator notes:</span> {p.fit_notes}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" className="h-8 text-xs" onClick={() => onRecordReferral(c)}>
              Record Referral / Introduction
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onViewProfile(c)}>
              View Profile
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onViewClientSummary(c)}>
              Client Summary
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 bg-white">
        <p className="text-xs text-slate-500 mb-2 flex items-center">
          <HelpCircle className="w-3.5 h-3.5 mr-1 text-cyan-600" />
          Start with the client's need — not the provider's name. Results are structured facts, not AI matches.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Need / Service Category *</Label>
            <select
              className="w-full text-sm rounded-md border border-slate-200 px-2 py-2 mt-1 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category…</option>
              {SERVICE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="NJ" className="h-9 mt-1 uppercase" maxLength={2} />
            </div>
            <div>
              <Label className="text-xs">County</Label>
              <Input value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Monmouth" className="h-9 mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">ZIP (optional)</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="07701" className="h-9 mt-1" maxLength={5} />
            </div>
            <div>
              <Label className="text-xs">Timeline / context (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. next 2 weeks" className="h-9 mt-1" />
            </div>
          </div>
        </div>
      </div>

      {!category ? (
        <div className="text-center py-10 text-slate-500 border rounded-lg">
          Select the service category your client needs to see appropriate professionals.
        </div>
      ) : result && result.confirmed.length === 0 && result.unknownArea.length === 0 ? (
        <div className="border rounded-lg p-6 text-center bg-amber-50 border-amber-200">
          <p className="font-semibold text-amber-900">
            NO CONFIRMED {categoryLabel(category).toUpperCase()} PROVIDER FOUND{hasLocation ? " FOR THIS LOCATION" : ""}.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            Unknown is preferable to pretending a match exists. Add a professional or broaden the search.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-3">
            <Button size="sm" onClick={onAddProfessional}><Plus className="w-4 h-4 mr-1" /> Add Professional</Button>
            <Button size="sm" variant="outline" onClick={() => { setCounty(""); setZip(""); setState(""); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> Clear Location
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {result?.confirmed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-emerald-800">
                {result.confirmed.length} appropriate option{result.confirmed.length > 1 ? "s" : ""}
              </p>
              {result.confirmed.map((item) => <ProviderCard key={item.contact.id} item={item} />)}
            </div>
          )}
          {result?.unknownArea.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-500">
                Service area unknown — possible options (verify coverage directly; unknown is not confirmed)
              </p>
              {result.unknownArea.map((item) => <ProviderCard key={item.contact.id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}