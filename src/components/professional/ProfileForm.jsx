import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SERVICE_CATEGORIES, LICENSE_STATUSES } from "@/components/professional/professionalNetworkModel";

// Controlled editor for the Contact professional_profile. FACTUAL PROFILE
// fields only; fit_notes is labeled as the PRIVATE operator observation.
export default function ProfileForm({ contact, onSaved, saving, setSaving }) {
  const p = contact.professional_profile || {};
  const [form, setForm] = useState({
    organization_name: p.organization_name || "",
    service_categories: p.service_categories || [],
    states: (p.service_area || {}).states || [],
    counties: (p.service_area || {}).counties || [],
    cities: (p.service_area || {}).cities || [],
    zip_codes: (p.service_area || {}).zip_codes || [],
    radius_miles: (p.service_area || {}).radius_miles || "",
    area_notes: (p.service_area || {}).notes || "",
    preferred_project_types: (p.preferences || {}).preferred_project_types || "",
    preferred_client_situations: (p.preferences || {}).preferred_client_situations || "",
    specialties: (p.preferences || {}).specialties || "",
    ideal_referrals: (p.preferences || {}).ideal_referrals || "",
    project_minimums: (p.preferences || {}).project_minimums || "",
    does_not_handle: (p.limitations || {}).does_not_handle || [],
    travel_limits: (p.limitations || {}).travel_limits || "",
    availability_constraints: (p.limitations || {}).availability_constraints || "",
    licensing_boundaries: (p.limitations || {}).licensing_boundaries || "",
    fit_notes: p.fit_notes || "",
    regulated_profession: (p.licensing || {}).regulated_profession || false,
    license_type: (p.licensing || {}).license_type || "",
    license_jurisdiction: (p.licensing || {}).license_jurisdiction || "",
    license_number: (p.licensing || {}).license_number || "",
    verification_status: (p.licensing || {}).verification_status || "NOT_VERIFIED",
    verified_at: (p.licensing || {}).verified_at || "",
    verification_source: (p.licensing || {}).verification_source || "",
    requires_professional_review: (p.licensing || {}).requires_professional_review || false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCategory = (key) => setForm((f) => ({
    ...f,
    service_categories: f.service_categories.includes(key)
      ? f.service_categories.filter((k) => k !== key)
      : [...f.service_categories, key],
  }));
  const arr = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

  const save = async () => {
    setSaving(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const profile = {
        organization_name: form.organization_name || null,
        organization_contact_id: p.organization_contact_id || null,
        service_categories: form.service_categories,
        service_area: {
          states: arr(form.states).map((s) => s.toUpperCase()),
          counties: arr(form.counties),
          cities: arr(form.cities),
          zip_codes: arr(form.zip_codes),
          radius_miles: form.radius_miles ? Number(form.radius_miles) : null,
          notes: form.area_notes || null,
        },
        preferences: {
          preferred_project_types: form.preferred_project_types || null,
          preferred_client_situations: form.preferred_client_situations || null,
          specialties: form.specialties || null,
          ideal_referrals: form.ideal_referrals || null,
          project_minimums: form.project_minimums || null,
          notes: (p.preferences || {}).notes || null,
        },
        limitations: {
          does_not_handle: arr(form.does_not_handle),
          travel_limits: form.travel_limits || null,
          availability_constraints: form.availability_constraints || null,
          licensing_boundaries: form.licensing_boundaries || null,
          notes: (p.limitations || {}).notes || null,
        },
        fit_notes: form.fit_notes || null,
        licensing: {
          regulated_profession: form.regulated_profession,
          license_type: form.license_type || null,
          license_jurisdiction: form.license_jurisdiction || null,
          license_number: form.license_number || null,
          verification_status: form.verification_status,
          verified_at: form.verified_at || null,
          verification_source: form.verification_source || null,
          requires_professional_review: form.requires_professional_review,
        },
      };
      const updated = await base44.entities.Contact.update(contact.id, { professional_profile: profile });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  const Text = ({ label, k, placeholder }) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className="h-9 mt-1" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Text label="Organization / Company" k="organization_name" placeholder="ABC Cleanouts" />
        <div>
          <Label className="text-xs">Primary contact</Label>
          <p className="text-sm text-slate-600 mt-1.5 border rounded-md px-3 py-2 bg-slate-50">
            {[contact.first_name, contact.last_name].filter(Boolean).join(" ")} (this Contact is the person to call)
          </p>
        </div>
      </div>

      <div>
        <Label className="text-xs font-semibold">Service Categories (what they do)</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {SERVICE_CATEGORIES.map((c) => (
            <button key={c.key} type="button"
              onClick={() => toggleCategory(c.key)}
              className={`text-xs px-2 py-1 rounded-full border ${form.service_categories.includes(c.key)
                ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-300"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">Service Area (where they work — not their office address)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Text label="States (comma sep)" k="states" placeholder="NJ, NY" />
          <Text label="Counties (comma sep)" k="counties" placeholder="Monmouth, Ocean" />
          <Text label="Cities (comma sep)" k="cities" placeholder="Red Bank" />
          <Text label="ZIPs (comma sep)" k="zip_codes" placeholder="07701, 07724" />
          <Text label="Radius (miles, optional)" k="radius_miles" placeholder="25" />
          <Text label="Area notes / exceptions" k="area_notes" placeholder="e.g. serves NJ only in summer" />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Empty means UNKNOWN coverage — never treated as confirmed.</p>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">Project Preferences (fit information)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Text label="Preferred project types" k="preferred_project_types" placeholder="full-house cleanouts" />
          <Text label="Preferred client situations" k="preferred_client_situations" placeholder="probate, downsizing" />
          <Text label="Specialties" k="specialties" placeholder="" />
          <Text label="Ideal referrals" k="ideal_referrals" placeholder="" />
          <Text label="Project minimums" k="project_minimums" placeholder="e.g. 1-truck minimum" />
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">Service Limitations (what they do NOT do)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Text label="Does not handle (comma sep)" k="does_not_handle" placeholder="hazardous materials, firearms" />
          <Text label="Travel limits" k="travel_limits" placeholder="does not travel outside Monmouth County" />
          <Text label="Availability constraints" k="availability_constraints" placeholder="no urgent projects" />
          <Text label="Licensing boundaries" k="licensing_boundaries" placeholder="" />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Unknown limitations must never be read as "no limitations".</p>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-start gap-2 bg-slate-50 border rounded-md p-2">
          <div className="flex-1">
            <Label className="text-xs font-semibold">Private Operator Observations (fit notes)</Label>
            <textarea
              className="w-full text-sm rounded-md border border-slate-200 px-2 py-1.5 mt-1 h-20"
              value={form.fit_notes}
              onChange={(e) => set("fit_notes", e.target.value)}
              placeholder="Typical response time, relationship context, fit observations. NEVER shown publicly or in client summaries."
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">Licensing / Professional Verification</p>
        <p className="text-[11px] text-slate-400 mb-2">Verification records what you know. It never concludes a referral is legal, a license is valid, or that none is required.</p>
        <div className="flex items-center gap-2 mb-2">
          <Switch checked={form.regulated_profession} onCheckedChange={(v) => set("regulated_profession", v)} />
          <Label className="text-xs">Regulated profession</Label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Text label="License type" k="license_type" placeholder="" />
          <Text label="Jurisdiction" k="license_jurisdiction" placeholder="NJ" />
          <Text label="License number" k="license_number" placeholder="" />
          <div>
            <Label className="text-xs">Verification status</Label>
            <select className="w-full text-sm rounded-md border border-slate-200 px-2 py-2 mt-1 bg-white"
              value={form.verification_status} onChange={(e) => set("verification_status", e.target.value)}>
              {LICENSE_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <Text label="Verified at (date)" k="verified_at" placeholder="2026-10-21" />
          <Text label="Verification source" k="verification_source" placeholder="e.g. NJ license lookup" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Switch checked={form.requires_professional_review} onCheckedChange={(v) => set("requires_professional_review", v)} />
          <Label className="text-xs">Requires professional review (verify requirements — broker/attorney/accountant/regulator)</Label>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save Professional Profile"}
      </Button>
    </div>
  );
}