import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { SERVICE_CATEGORIES } from "@/components/professional/professionalNetworkModel";

// Smallest "add professional" flow — creates a canonical Contact with a
// professional role and the beginning of a professional_profile. No new entity.
export default function NewProfessionalDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    organization_name: "", states: "", counties: "",
  });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (key) => setCategories((prev) =>
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const arr = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

  const create = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const created = await base44.entities.Contact.create({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        roles: ["referral"],
        lead_source: "referral",
        assigned_to: me?.id || null,
        professional_profile: {
          organization_name: form.organization_name.trim() || null,
          service_categories: categories,
          service_area: {
            states: arr(form.states).map((s) => s.toUpperCase()),
            counties: arr(form.counties),
            cities: [],
            zip_codes: [],
            radius_miles: null,
            notes: null,
          },
          preferences: {},
          limitations: {},
          licensing: {},
        },
      });
      onCreated(created);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Professional</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">First name *</Label>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last name *</Label>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-9 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Organization / Company</Label>
              <Input value={form.organization_name} onChange={(e) => set("organization_name", e.target.value)} className="h-9 mt-1" placeholder="ABC Cleanouts" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Service categories</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SERVICE_CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => toggleCat(c.key)}
                  className={`text-xs px-2 py-1 rounded-full border ${categories.includes(c.key)
                    ? "bg-cyan-600 text-white border-cyan-600" : "bg-white text-slate-600 border-slate-300"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">States served (comma sep)</Label>
              <Input value={form.states} onChange={(e) => set("states", e.target.value)} className="h-9 mt-1" placeholder="NJ" />
            </div>
            <div>
              <Label className="text-xs">Counties served (comma sep)</Label>
              <Input value={form.counties} onChange={(e) => set("counties", e.target.value)} className="h-9 mt-1" placeholder="Monmouth" />
            </div>
          </div>
          <Button onClick={create} disabled={saving || !form.first_name.trim() || !form.last_name.trim()} className="w-full">
            {saving ? "Creating…" : "Add Professional"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}