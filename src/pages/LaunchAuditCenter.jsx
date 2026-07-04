import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORY_LABELS = {
  public_experience: 'Public Experience',
  consumer_experience: 'Consumer Experience',
  estate_sale_company_experience: 'Estate Sale Company',
  dealer_experience: 'Dealer Experience',
  reseller_experience: 'Reseller Experience',
  vendor_experience: 'Vendor Experience',
  admin_experience: 'Admin Experience',
  inventory: 'Inventory System',
  pos: 'POS / Checkout',
  marketplace: 'Marketplace',
  crm: 'CRM',
  marketing: 'Marketing Center',
  subscriptions: 'Subscriptions',
  payments: 'Payments',
  ai: 'AI / LLM',
  super_agents: 'Super Agents',
  seo: 'SEO Engine',
  performance: 'Performance',
  mobile: 'Mobile',
  accessibility: 'Accessibility',
  security: 'Security',
  recovery: 'Recovery System',
  analytics: 'Analytics',
  conversion_optimization: 'Conversion Optimization',
  overall: 'Overall',
};

function scoreColor(score) {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-amber-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

function scoreBadge(score) {
  if (score >= 90) return { variant: 'default', label: 'Ready' };
  if (score >= 75) return { variant: 'secondary', label: 'Soft Launch' };
  if (score >= 50) return { variant: 'outline', label: 'Beta' };
  return { variant: 'destructive', label: 'Not Ready' };
}

export default function LaunchAuditCenter() {
  const [scores, setScores] = useState([]);
  const [issues, setIssues] = useState([]);
  const [recoveryEvents, setRecoveryEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIssue, setExpandedIssue] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoreData, issueData, recoveryData] = await Promise.all([
        base44.entities.LaunchReadinessScore.list('-audit_date', 50),
        base44.entities.LaunchIssue.filter({ status: { $in: ['open', 'in_progress'] } }, '-created_date', 50),
        base44.entities.AgentRecoveryEvent.filter({}, '-created_date', 20),
      ]);
      setScores(scoreData || []);
      setIssues(issueData || []);
      setRecoveryEvents(recoveryData || []);
    } catch (e) {
      console.error('Audit load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const overallScore = scores.find(s => s.category === 'overall');
  const blockerCount = issues.filter(i => i.is_launch_blocker).length;
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const recoveredCount = recoveryEvents.filter(e => e.status === 'recovered').length;
  const overallVal = overallScore?.score || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Launch Readiness Audit Center</h1>
              <p className="text-sm text-slate-500">Production reliability monitoring & issue tracking</p>
            </div>
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Overall Score</p>
                  <p className={`text-3xl font-bold ${scoreColor(overallVal)}`}>{overallVal}</p>
                </div>
                <TrendingUp className={`w-8 h-8 ${scoreColor(overallVal)}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Launch Blockers</p>
                  <p className="text-3xl font-bold text-red-600">{blockerCount}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Critical Issues</p>
                  <p className="text-3xl font-bold text-orange-600">{criticalCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Recovery Events</p>
                  <p className="text-3xl font-bold text-cyan-600">{recoveredCount}</p>
                  <p className="text-xs text-slate-400">auto-recovered</p>
                </div>
                <Activity className="w-8 h-8 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendation Banner */}
        <Card className={overallVal >= 98 ? 'border-green-500' : overallVal >= 75 ? 'border-amber-500' : 'border-red-500'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {overallVal >= 98 ? <CheckCircle className="w-6 h-6 text-green-600" /> : <AlertTriangle className="w-6 h-6 text-amber-600" />}
              <div>
                <p className="font-semibold text-slate-900">
                  Recommendation: {overallVal >= 98 ? 'Ready to Launch' : overallVal >= 75 ? 'Soft Launch' : overallVal >= 50 ? 'Invite-Only Beta' : 'Internal QA Only'}
                </p>
                <p className="text-sm text-slate-500">
                  {blockerCount > 0
                    ? `${blockerCount} critical launch blocker${blockerCount > 1 ? 's' : ''} must be resolved before launch.`
                    : 'No critical launch blockers detected.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Category Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {scores
                  .filter(s => s.category !== 'overall')
                  .map((score) => {
                    const badge = scoreBadge(score.score);
                    return (
                      <div key={score.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-slate-700">{CATEGORY_LABELS[score.category] || score.category}</span>
                          {score.critical_blockers > 0 && (
                            <Badge variant="destructive" className="text-xs">{score.critical_blockers} blocker{score.critical_blockers > 1 ? 's' : ''}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{score.items_passed || 0}/{score.items_tested || 0} passed</span>
                          <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                          <span className={`text-lg font-bold ${scoreColor(score.score)}`}>{score.score}</span>
                        </div>
                      </div>
                    );
                  })}
                {scores.filter(s => s.category !== 'overall').length === 0 && (
                  <p className="text-center text-slate-400 py-8">No audit scores recorded yet. Run an audit to populate.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Open Launch Issues ({issues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-500">No open issues. All clear!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div key={issue.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {issue.severity === 'critical' && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                        {issue.severity === 'high' && <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                        {issue.severity === 'medium' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                        {issue.severity === 'low' && <AlertTriangle className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                        <span className="text-sm font-medium text-slate-700 truncate">{issue.issue_title}</span>
                        {issue.is_launch_blocker && <Badge variant="destructive" className="text-xs flex-shrink-0">BLOCKER</Badge>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">{issue.affected_module}</Badge>
                        {expandedIssue === issue.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    {expandedIssue === issue.id && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-sm">
                        <p><span className="font-semibold text-slate-600">Role:</span> <span className="text-slate-700">{issue.affected_role}</span></p>
                        <p><span className="font-semibold text-slate-600">Severity:</span> <span className="text-slate-700">{issue.severity}</span></p>
                        <p><span className="font-semibold text-slate-600">Assigned Agent:</span> <span className="text-slate-700">{issue.assigned_super_agent || 'Unassigned'}</span></p>
                        {issue.issue_description && <p><span className="font-semibold text-slate-600">Description:</span> <span className="text-slate-700">{issue.issue_description}</span></p>}
                        {issue.steps_to_reproduce && <p><span className="font-semibold text-slate-600">Steps:</span> <span className="text-slate-700">{issue.steps_to_reproduce}</span></p>}
                        {issue.suggested_fix && <p><span className="font-semibold text-slate-600">Suggested Fix:</span> <span className="text-slate-700">{issue.suggested_fix}</span></p>}
                        {issue.error_message && <p className="font-mono text-xs text-red-600 mt-2">{issue.error_message}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Recovery Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Recent Recovery Events</CardTitle>
          </CardHeader>
          <CardContent>
            {recoveryEvents.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No recovery events recorded.</p>
            ) : (
              <div className="space-y-2">
                {recoveryEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-cyan-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{event.event_type?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-400">{event.page_module || event.page_url || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.status === 'recovered' ? 'default' : 'destructive'} className="text-xs">{event.status}</Badge>
                      <Badge variant="outline" className="text-xs">{event.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}