import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const NOTIFY_LABELS = {
  sent: { label: "Agents notified", cls: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Partly notified", cls: "bg-amber-100 text-amber-700" },
  no_agents: { label: "No agents found", cls: "bg-slate-100 text-slate-600" },
  failed: { label: "Not notified", cls: "bg-red-100 text-red-700" },
  not_sent: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
};

export default function MySubmittedReferrals({ userId, refreshKey }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const page = await base44.entities.ReferralLead.filter(
        { source_user_id: userId },
        { sort: "-created_date", limit: 10 }
      );
      const rows = Array.isArray(page) ? page : page.items || [];
      if (active) {
        setLeads(rows);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, refreshKey]);

  if (loading) return <p className="text-sm text-slate-500">Loading your referrals…</p>;
  if (leads.length === 0) return <p className="text-sm text-slate-500">You haven't submitted any client referrals yet.</p>;

  return (
    <div className="divide-y divide-slate-100">
      {leads.map((lead) => {
        const notify = NOTIFY_LABELS[lead.agent_notify_status] || NOTIFY_LABELS.not_sent;
        return (
          <div key={lead.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-800">{lead.client_name}</p>
              <Badge className={notify.cls}>{notify.label}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {[lead.property_address, lead.property_city, lead.property_state].filter(Boolean).join(", ")}
            </p>
            {lead.agent_notify_note && <p className="mt-1 text-xs text-slate-500">{lead.agent_notify_note}</p>}
          </div>
        );
      })}
    </div>
  );
}