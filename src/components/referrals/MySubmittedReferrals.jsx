import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { MapPin, ChevronDown, ChevronUp, Phone, MessageSquareText } from "lucide-react";

const NOTIFY_LABELS = {
  sent: { label: "Agents notified", cls: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Partly notified", cls: "bg-amber-100 text-amber-700" },
  no_agents: { label: "No agents found", cls: "bg-slate-100 text-slate-600" },
  failed: { label: "Not notified", cls: "bg-red-100 text-red-700" },
  not_sent: { label: "Pending", cls: "bg-slate-100 text-slate-600" },
};

const ENGAGEMENT_LABELS = {
  not_contacted: { label: "Awaiting agent report", cls: "bg-slate-100 text-slate-600" },
  attempted: { label: "Agent tried to reach client", cls: "bg-amber-100 text-amber-700" },
  connected: { label: "Agent connected with client", cls: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Client declined", cls: "bg-red-100 text-red-700" },
};

const METHOD_LABELS = { call: "Phone call", text: "Text", email: "Email", in_person: "In person", other: "Other" };
const OUTCOME_LABELS = {
  connected: "Spoke with client",
  left_message: "Left a message",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  declined: "Declined",
  other: "Other",
};

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MySubmittedReferrals({ userId, refreshKey }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

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
        const engagement = ENGAGEMENT_LABELS[lead.agent_engagement] || ENGAGEMENT_LABELS.not_contacted;
        const attempts = Array.isArray(lead.contact_attempts) ? lead.contact_attempts : [];
        const open = openId === lead.id;
        return (
          <div key={lead.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-slate-800">{lead.client_name}</p>
              <Badge className={notify.cls}>{notify.label}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge className={engagement.cls}>{engagement.label}</Badge>
              {attempts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : lead.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {attempts.length} report{attempts.length === 1 ? "" : "s"}
                  {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {[lead.property_address, lead.property_city, lead.property_state].filter(Boolean).join(", ")}
            </p>
            {lead.agent_notify_note && <p className="mt-1 text-xs text-slate-500">{lead.agent_notify_note}</p>}

            {open && attempts.length > 0 && (
              <div className="mt-2 space-y-2">
                {[...attempts].reverse().map((attempt) => (
                  <div key={attempt.attempt_id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={attempt.connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {OUTCOME_LABELS[attempt.outcome] || attempt.outcome}
                      </Badge>
                      <span className="text-xs text-slate-500">{formatWhen(attempt.at)}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-slate-800">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {attempt.agent_name} · {METHOD_LABELS[attempt.method] || attempt.method}
                    </p>
                    {attempt.spoke_with && (
                      <p className="text-xs text-slate-600">Spoke with {attempt.spoke_with}</p>
                    )}
                    {attempt.notes && <p className="mt-1 text-sm text-slate-600">{attempt.notes}</p>}
                    {attempt.agent_email && <p className="mt-1 text-[11px] text-slate-400">{attempt.agent_email}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}