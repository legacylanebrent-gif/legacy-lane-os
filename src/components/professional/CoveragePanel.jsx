import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  SERVICE_CATEGORIES, categoryLabel, geoCoverage, getProfile, displayName,
} from "@/components/professional/professionalNetworkModel";

export default function CoveragePanel({ contacts }) {
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");

  const rows = useMemo(() => {
    const st = state.trim().toUpperCase();
    const cty = county.trim();
    if (!st && !cty) return null;
    return SERVICE_CATEGORIES.map((cat) => {
      const confirmed = [];
      for (const c of contacts) {
        const p = getProfile(c);
        if (!(p.service_categories || []).includes(cat.key)) continue;
        const g = geoCoverage(p, { state: st, county: cty });
        if (g.tier === "confirmed") confirmed.push(displayName(c));
      }
      return { key: cat.key, label: cat.label, confirmed };
    });
  }, [contacts, state, county]);

  const emptyCategories = useMemo(
    () => SERVICE_CATEGORIES.filter((cat) => !contacts.some((c) => (getProfile(c).service_categories || []).includes(cat.key))),
    [contacts]
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-3 bg-white grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">State</Label>
          <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="NJ" className="h-9 mt-1 uppercase" maxLength={2} />
        </div>
        <div>
          <Label className="text-xs">County</Label>
          <Input value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Monmouth" className="h-9 mt-1" />
        </div>
      </div>

      {rows === null ? (
        <div className="text-center py-10 text-slate-500 border rounded-lg">
          Enter a state (and optionally a county) to see your network coverage by service category.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.key} className="border rounded-lg p-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <p className="text-sm font-medium text-slate-900">{r.label}</p>
                {r.confirmed.length > 0 ? (
                  <p className="text-xs text-slate-600">{r.confirmed.join(" · ")}</p>
                ) : (
                  <p className="text-xs text-amber-700">NO CONFIRMED PROVIDER for this location.</p>
                )}
              </div>
              <Badge className={
                r.confirmed.length > 1 ? "bg-emerald-50 text-emerald-800 border-emerald-300 shrink-0"
                  : r.confirmed.length === 1 ? "bg-emerald-50 text-emerald-800 border-emerald-300 shrink-0"
                  : "bg-amber-50 text-amber-800 border-amber-300 shrink-0"
              }>
                {r.confirmed.length} confirmed
              </Badge>
            </div>
          ))}
        </div>
      )}

      {emptyCategories.length > 0 && (
        <div className="border rounded-lg p-3 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Service categories with no provider on record</p>
          <p className="text-xs text-slate-500 mt-1">{emptyCategories.map((c) => c.label).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}