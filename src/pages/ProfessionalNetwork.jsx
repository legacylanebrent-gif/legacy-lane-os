import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import {
  isProfessionalContact, getProfile, displayName, categoryLabel, serviceAreaSummary,
} from "@/components/professional/professionalNetworkModel";
import WhoCanHelpPanel from "@/components/professional/WhoCanHelpPanel";
import CoveragePanel from "@/components/professional/CoveragePanel";
import ProfessionalProfileDialog from "@/components/professional/ProfessionalProfileDialog";
import NewProfessionalDialog from "@/components/professional/NewProfessionalDialog";
import OutboundReferralDialog from "@/components/professional/OutboundReferralDialog";
import ClientSummaryDialog from "@/components/professional/ClientSummaryDialog";

export default function ProfessionalNetwork() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profileContact, setProfileContact] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [referralProvider, setReferralProvider] = useState(null);
  const [summaryProvider, setSummaryProvider] = useState(null);

  const loadContacts = async () => {
    try {
      const res = await base44.entities.Contact.filter({}, { sort: "-created_date", limit: 200 });
      const arr = res.items || res;
      setContacts(arr.filter(isProfessionalContact));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, []);

  const handleSaved = (updated) => {
    if (updated) {
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setProfileContact((prev) => (prev && prev.id === updated.id ? updated : prev));
    } else {
      loadContacts();
    }
  };

  const q = search.toLowerCase().trim();
  const visible = contacts.filter((c) => {
    if (!q) return true;
    const p = getProfile(c);
    const hay = [displayName(c), c.email, c.phone, (p.service_categories || []).join(" ")]
      .join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Professional Network</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Your referral network: what they do, where they work, and who to call. The network feeds your sale pipeline — it is not another CRM.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> Add Professional
        </Button>
      </div>

      <Tabs defaultValue="whocanhelp">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid h-auto">
          <TabsTrigger value="whocanhelp" className="text-xs px-2">Who Can Help?</TabsTrigger>
          <TabsTrigger value="network" className="text-xs px-2">My Network</TabsTrigger>
          <TabsTrigger value="coverage" className="text-xs px-2">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="whocanhelp" className="mt-4">
          <WhoCanHelpPanel
            contacts={contacts}
            onRecordReferral={setReferralProvider}
            onViewProfile={setProfileContact}
            onViewClientSummary={setSummaryProvider}
            onAddProfessional={() => setNewOpen(true)}
          />
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <div className="mb-3">
            <input
              className="w-full text-sm rounded-md border border-slate-200 px-3 py-2"
              placeholder="Search name, organization, email, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading professionals…
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-12 text-slate-500 border rounded-lg">
              <p className="font-medium text-slate-700">No professionals on record yet.</p>
              <p className="text-sm mt-1">Add the professionals you rely on, or use Who Can Help? to start building your network.</p>
              <Button onClick={() => setNewOpen(true)} size="sm" className="mt-3">
                <Plus className="w-4 h-4 mr-1" /> Add Professional
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map((c) => {
                const p = getProfile(c);
                return (
                  <div key={c.id} className="border rounded-lg p-3 bg-white">
                    <button className="text-left w-full" onClick={() => setProfileContact(c)}>
                      <p className="font-semibold text-slate-900">{displayName(c)}</p>
                      <p className="text-xs text-slate-500">{c.email || ""} {c.phone ? `· ${c.phone}` : ""}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(p.service_categories || []).map((k) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                            {categoryLabel(k)}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">{serviceAreaSummary(p)}</p>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <CoveragePanel contacts={contacts} />
        </TabsContent>
      </Tabs>

      {profileContact && (
        <ProfessionalProfileDialog
          contact={profileContact}
          onClose={() => setProfileContact(null)}
          onSaved={handleSaved}
          onRecordReferral={setReferralProvider}
          onViewClientSummary={setSummaryProvider}
        />
      )}
      {newOpen && (
        <NewProfessionalDialog onClose={() => setNewOpen(false)} onCreated={(c) => { setNewOpen(false); setProfileContact(c); }} />
      )}
      {referralProvider && (
        <OutboundReferralDialog
          provider={referralProvider}
          onClose={() => setReferralProvider(null)}
          onSaved={(updated) => { setReferralProvider(null); handleSaved(updated); setProfileContact(updated); }}
        />
      )}
      {summaryProvider && (
        <ClientSummaryDialog provider={summaryProvider} onClose={() => setSummaryProvider(null)} />
      )}
    </div>
  );
}