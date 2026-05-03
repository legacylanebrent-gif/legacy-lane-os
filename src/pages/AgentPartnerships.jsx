import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import TerritoryProfileCard from '@/components/agentpartner/TerritoryProfileCard';
import AgentMatchCard from '@/components/agentpartner/AgentMatchCard';

const TABS = [
  { id: 'available', label: 'Available Agents', icon: Users },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'accepted', label: 'Active Partnerships', icon: CheckCircle },
  { id: 'declined', label: 'Declined', icon: XCircle },
];

export default function AgentPartnerships() {
  const [user, setUser] = useState(null);
  const [territory, setTerritory] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [requesting, setRequesting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    if (u) {
      const profiles = await base44.entities.OperatorTerritoryProfile.filter({ operator_id: u.id });
      setTerritory(profiles[0] || null);
      const m = await base44.entities.OperatorAgentMatch.filter({ operator_id: u.id });
      m.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
      setMatches(m);
    }
    setLoading(false);
  };

  const handleSyncHouszu = async () => {
    setSyncing(true);
    const res = await base44.functions.invoke('getMatchingAgentsFromHouszu', {});
    if (res.data?.matches) {
      const sorted = [...res.data.matches].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
      setMatches(sorted);
    }
    if (res.data?.territory) setTerritory(res.data.territory);
    setSyncing(false);
  };

  const handleRequestPartnership = async (matchId) => {
    setRequesting(matchId);
    await base44.functions.invoke('requestAgentPartnership', { match_id: matchId });
    // Refresh matches
    const m = await base44.entities.OperatorAgentMatch.filter({ operator_id: user.id });
    m.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    setMatches(m);
    setRequesting(null);
  };

  const filteredMatches = matches.filter(m => {
    if (activeTab === 'available') return m.status === 'pending';
    return m.status === activeTab;
  });

  const tabCounts = {
    available: matches.filter(m => m.status === 'pending').length,
    pending: matches.filter(m => m.status === 'pending').length,
    accepted: matches.filter(m => m.status === 'accepted').length,
    declined: matches.filter(m => m.status === 'declined').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agent Partnerships</h1>
            <p className="text-slate-500 text-sm mt-0.5">Match with local real estate agents through the Legacy Lane referral exchange.</p>
          </div>
          <Button
            onClick={handleSyncHouszu}
            disabled={syncing || !territory}
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Agents from Houszu'}
          </Button>
        </div>

        {/* Territory Profile */}
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">My Territory Profile</h2>
          <TerritoryProfileCard
            profile={territory}
            operatorId={user?.id}
            onSaved={loadData}
          />
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-slate-200 rounded-xl p-1 w-fit flex-wrap">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-orange-100 text-orange-700' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {filteredMatches.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
                {activeTab === 'available'
                  ? territory
                    ? 'No available agents yet. Click "Sync Agents from Houszu" to find matches.'
                    : 'Set up your territory profile first, then sync agents.'
                  : `No ${activeTab} partnerships.`}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMatches.map(match => (
                  <AgentMatchCard
                    key={match.id}
                    match={match}
                    showRequestButton={activeTab === 'available'}
                    onRequest={handleRequestPartnership}
                    requesting={requesting}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}