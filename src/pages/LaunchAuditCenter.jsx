import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Rocket, Globe, GitBranch, ArrowRight, Zap, MapPin, BarChart2, Users } from 'lucide-react';
import AuditScorecard from '@/components/audit/AuditScorecard';
import LandingPageAudit from '@/components/audit/LandingPageAudit';
import FunnelAudit from '@/components/audit/FunnelAudit';
import LeadRoutingAudit from '@/components/audit/LeadRoutingAudit';
import ScoringAndAgentAudit from '@/components/audit/ScoringAndAgentAudit';
import AudienceExportCenter from '@/components/audit/AudienceExportCenter';
import LeadPipelineAudit from '@/components/audit/LeadPipelineAudit';
import SuperAgentUtilization from '@/components/audit/SuperAgentUtilization';
import AutomationOpportunities from '@/components/audit/AutomationOpportunities';
import SuperAgentPerformance from '@/components/audit/SuperAgentPerformance';
import AICOOReport from '@/components/audit/AICOOReport';

const NAV_ITEMS = [
  { tab: 'pages', label: 'Landing Pages', icon: Globe },
  { tab: 'funnels', label: 'Funnels', icon: ArrowRight },
  { tab: 'routing', label: 'Lead Routing', icon: GitBranch },
  { tab: 'scoring', label: 'Scoring & AI', icon: Zap },
  { tab: 'pipeline', label: 'Pipeline', icon: BarChart2 },
  { tab: 'audiences', label: 'Audiences', icon: Users },
  { tab: 'superagent', label: 'SuperAgent Optimization', icon: Zap },
];

export default function LaunchAuditCenter() {
  const [scores, setScores] = useState({
    pages: { built: 0, total: 9 },
    funnels: { complete: 0, total: 6 },
    routing: { active: 0, total: 6 },
    scoring: { active: 0, total: 12 },
    audiences: { captured: 0, total: 1 },
  });

  const updateScore = useCallback((section, data) => {
    setScores(prev => ({ ...prev, [section]: { ...prev[section], ...data } }));
  }, []);

  const calcScore = () => {
    const pts = [
      scores.pages.built / Math.max(scores.pages.total, 1),
      scores.funnels.complete / Math.max(scores.funnels.total, 1),
      scores.routing.active / Math.max(scores.routing.total, 1),
      scores.scoring.active / Math.max(scores.scoring.total, 1),
      scores.audiences.captured,
    ];
    return Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100);
  };

  const breakdown = [
    { label: 'Pages Built', value: scores.pages.built, total: scores.pages.total },
    { label: 'Funnels Connected', value: scores.funnels.complete, total: scores.funnels.total },
    { label: 'Routing Active', value: scores.routing.active, total: scores.routing.total },
    { label: 'AI/Scoring Active', value: scores.scoring.active, total: scores.scoring.total },
    { label: 'Audience Capture', value: scores.audiences.captured, total: 1 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Launch Audit Center</h1>
              <p className="text-slate-500 text-sm">Verify every page, funnel, routing engine, and audience before July 1 launch</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Scorecard */}
        <AuditScorecard score={calcScore()} breakdown={breakdown} />

        {/* Tabs */}
        <Tabs defaultValue="pages">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1 h-auto flex-wrap gap-1 w-full">
            {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
              <TabsTrigger key={tab} value={tab}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                <Icon className="w-4 h-4" />{label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-4">
            <TabsContent value="pages" className="mt-0">
              <LandingPageAudit onScoreUpdate={data => updateScore('pages', data)} />
            </TabsContent>

            <TabsContent value="funnels" className="mt-0">
              <FunnelAudit onScoreUpdate={data => updateScore('funnels', data)} />
            </TabsContent>

            <TabsContent value="routing" className="mt-0">
              <LeadRoutingAudit onScoreUpdate={data => updateScore('routing', data)} />
            </TabsContent>

            <TabsContent value="scoring" className="mt-0">
              <ScoringAndAgentAudit onScoreUpdate={data => updateScore('scoring', data)} />
            </TabsContent>

            <TabsContent value="pipeline" className="mt-0">
              <LeadPipelineAudit />
            </TabsContent>

            <TabsContent value="audiences" className="mt-0">
              <AudienceExportCenter onScoreUpdate={data => updateScore('audiences', data)} />
            </TabsContent>

            <TabsContent value="superagent" className="mt-0 space-y-10">
              <SuperAgentUtilization />
              <div className="border-t border-slate-200 pt-8"><AutomationOpportunities /></div>
              <div className="border-t border-slate-200 pt-8"><SuperAgentPerformance /></div>
              <div className="border-t border-slate-200 pt-8"><AICOOReport /></div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}