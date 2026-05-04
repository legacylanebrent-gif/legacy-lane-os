import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import AdminAICommandConsole from '@/components/adminai/AdminAICommandConsole';
import AdminAIOutputPanel from '@/components/adminai/AdminAIOutputPanel';
import AdminAIReportHistory from '@/components/adminai/AdminAIReportHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, History, AlertTriangle, Settings, Cpu, ListTodo, Share2, Megaphone } from 'lucide-react';
import AgentChainIndicator from '@/components/adminai/AgentChainIndicator';
import AdminAISettingsPanel from '@/components/adminai/AdminAISettingsPanel';
import AutonomousRunComposer from '@/components/autonomous/AutonomousRunComposer';
import AutonomousRunCard from '@/components/autonomous/AutonomousRunCard';
import AutonomousRunDetailModal from '@/components/autonomous/AutonomousRunDetailModal';
import ExecutionConfirmModal from '@/components/autonomous/ExecutionConfirmModal';
import ActionQueuePanel from '@/components/autonomous/ActionQueuePanel';
import SocialAutopilotTab from '@/components/social/SocialAutopilotTab';
import FacebookAdsAutopilotTab from '@/components/fbads/FacebookAdsAutopilotTab';

export default function AdminAIOperator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [reports, setReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [savedReportId, setSavedReportId] = useState(null);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [activeTab, setActiveTab] = useState('command');
  const [taskFeedback, setTaskFeedback] = useState('');

  // Autonomous runs state
  const [runs, setRuns] = useState([]);
  const [proposing, setProposing] = useState(false);
  const [approving, setApproving] = useState(null);
  const [executing, setExecuting] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [confirmExecuteRun, setConfirmExecuteRun] = useState(null);
  const [executeFeedback, setExecuteFeedback] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          loadReports();
          loadRuns();
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const loadReports = async () => {
    try {
      const data = await base44.entities.AdminAIReport.list('-created_at', 50);
      setReports(data);
    } catch (_) { setReports([]); }
  };

  const loadRuns = async () => {
    try {
      const data = await base44.entities.AutonomousAgentRun.list('-created_at', 50);
      setRuns(data);
    } catch (_) { setRuns([]); }
  };

  const handlePropose = async (payload) => {
    setProposing(true);
    setExecuteFeedback('');
    try {
      await base44.functions.invoke('proposeAutonomousRun', payload);
      await loadRuns();
      setActiveTab('autonomous');
    } catch (err) {
      alert('Error proposing run: ' + (err?.response?.data?.error || err.message));
    }
    setProposing(false);
  };

  const handleApprove = async (run_id) => {
    setApproving(run_id);
    try {
      await base44.functions.invoke('approveAutonomousRun', { run_id });
      await loadRuns();
      if (selectedRun?.id === run_id) {
        const updated = runs.find(r => r.id === run_id);
        if (updated) setSelectedRun({ ...updated, status: 'approved' });
      }
    } catch (err) {
      alert('Approve failed: ' + (err?.response?.data?.error || err.message));
    }
    setApproving(null);
  };

  const handleExecuteRequest = (run_id) => {
    const run = runs.find(r => r.id === run_id);
    setConfirmExecuteRun(run);
  };

  const handleExecuteConfirm = async () => {
    if (!confirmExecuteRun) return;
    const run_id = confirmExecuteRun.id;
    setConfirmExecuteRun(null);
    setExecuting(run_id);
    setExecuteFeedback('');
    try {
      const res = await base44.functions.invoke('executeAutonomousRun', { run_id });
      setExecuteFeedback(`✓ ${res.data.summary}`);
      await loadRuns();
    } catch (err) {
      setExecuteFeedback('Execution error: ' + (err?.response?.data?.error || err.message));
    }
    setExecuting(null);
  };

  const handleCancel = async (run_id) => {
    setCancelling(run_id);
    try {
      await base44.functions.invoke('cancelAutonomousRun', { run_id });
      await loadRuns();
    } catch (err) {
      alert('Cancel failed: ' + err.message);
    }
    setCancelling(null);
  };

  const handleSubmit = async (payload) => {
    setRunning(true);
    setResult(null);
    setSavedReportId(null);
    setTaskFeedback('');
    setCurrentCommand(payload);
    try {
      const res = await base44.functions.invoke('adminAiOperator', payload);
      setResult(res.data.result);
      setActiveTab('output');
    } catch (err) {
      alert('Error: ' + (err?.response?.data?.error || err.message));
    }
    setRunning(false);
  };

  const handleSave = async () => {
    if (!result || !currentCommand) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const record = await base44.entities.AdminAIReport.create({
        title: result.title,
        command: currentCommand.command,
        command_type: currentCommand.command_type,
        execution_mode: currentCommand.execution_mode,
        context_used: currentCommand.context_toggles || {},
        executive_summary: result.executive_summary,
        recommended_actions: result.recommended_actions,
        assets_created: result.assets_created,
        kpi_targets: result.kpi_targets,
        risks_watchouts: result.risks_watchouts,
        next_steps: result.next_steps,
        full_ai_response: JSON.stringify(result),
        status: 'active',
        created_by: user?.full_name || '',
        created_by_email: user?.email || '',
        created_at: now,
        updated_at: now,
      });
      setSavedReportId(record.id);
      loadReports();
      alert('Report saved successfully!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };

  const handleCreateTasks = async () => {
    if (!result) return;
    setCreatingTasks(true);
    setTaskFeedback('');
    try {
      const res = await base44.functions.invoke('createAdminTasksFromAIReport', {
        report_id: savedReportId || '',
        actions_text: result.recommended_actions,
        next_steps_text: result.next_steps,
      });
      setTaskFeedback(`✓ ${res.data.tasks_created} admin tasks created successfully.`);
    } catch (err) {
      setTaskFeedback('Error creating tasks: ' + err.message);
    }
    setCreatingTasks(false);
  };

  const handleViewReport = (report) => {
    setResult({
      title: report.title,
      executive_summary: report.executive_summary,
      recommended_actions: report.recommended_actions,
      assets_created: report.assets_created,
      kpi_targets: report.kpi_targets,
      risks_watchouts: report.risks_watchouts,
      next_steps: report.next_steps,
    });
    setSavedReportId(report.id);
    setCurrentCommand({
      command: report.command,
      command_type: report.command_type,
      execution_mode: report.execution_mode,
      context_toggles: report.context_used || {},
    });
    setActiveTab('output');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Brain className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white font-serif tracking-tight">Legacy Lane Admin AI Operator</h1>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Admin Only</Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Command the AI to analyze, plan, draft, and execute administrative growth workflows across Legacy Lane OS.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>{user.full_name || user.email}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/60 border border-slate-700 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="command" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <Brain className="w-3.5 h-3.5 mr-1.5" />Command Console
            </TabsTrigger>
            <TabsTrigger value="output" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs" disabled={!result}>
              Output Panel
            </TabsTrigger>
            <TabsTrigger value="autonomous" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <Cpu className="w-3.5 h-3.5 mr-1.5" />Autonomous Runs {runs.length > 0 && `(${runs.length})`}
            </TabsTrigger>
            <TabsTrigger value="queue" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <ListTodo className="w-3.5 h-3.5 mr-1.5" />Action Queue
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />Report History
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />Social Autopilot
            </TabsTrigger>
            <TabsTrigger value="fbads" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-500 text-xs">
              <Megaphone className="w-3.5 h-3.5 mr-1.5" />FB Ads Autopilot
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400 text-xs">
              <Settings className="w-3.5 h-3.5 mr-1.5" />Settings
            </TabsTrigger>
          </TabsList>

          {/* Command Console */}
          <TabsContent value="command">
            <div className="space-y-4">
              <AgentChainIndicator running={running} />
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                <AdminAICommandConsole onSubmit={handleSubmit} loading={running} />
              </div>
            </div>
          </TabsContent>

          {/* Output Panel */}
          <TabsContent value="output">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
              <AdminAIOutputPanel
                result={result}
                onSave={handleSave}
                onCreateTasks={handleCreateTasks}
                saving={saving}
                creatingTasks={creatingTasks}
              />
              {taskFeedback && (
                <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  {taskFeedback}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Autonomous Runs */}
          <TabsContent value="autonomous">
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Propose New Autonomous Run</h3>
                </div>
                <AutonomousRunComposer onPropose={handlePropose} loading={proposing} />
              </div>

              {executeFeedback && (
                <div className={`p-3 rounded-lg border text-sm ${executeFeedback.startsWith('✓') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {executeFeedback}
                </div>
              )}

              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">All Runs ({runs.length})</h3>
                  <button onClick={loadRuns} className="text-xs text-amber-400 hover:text-amber-300">↻ Refresh</button>
                </div>
                {runs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No autonomous runs yet. Use the composer above to propose your first run.</div>
                ) : (
                  <div className="space-y-3">
                    {runs.map(run => (
                      <AutonomousRunCard
                        key={run.id}
                        run={run}
                        onView={r => setSelectedRun(r)}
                        onApprove={handleApprove}
                        onExecute={handleExecuteRequest}
                        onCancel={handleCancel}
                        approving={approving}
                        executing={executing}
                        cancelling={cancelling}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Action Queue */}
          <TabsContent value="queue">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
              <ActionQueuePanel />
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Previous AI Reports</h3>
                <button onClick={loadReports} className="text-xs text-amber-400 hover:text-amber-300">↻ Refresh</button>
              </div>
              <AdminAIReportHistory reports={reports} onView={handleViewReport} />
            </div>
          </TabsContent>

          {/* Social Autopilot */}
          <TabsContent value="social">
            <SocialAutopilotTab user={user} />
          </TabsContent>

          {/* Facebook Ads Autopilot */}
          <TabsContent value="fbads">
            <FacebookAdsAutopilotTab user={user} />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <AdminAISettingsPanel user={user} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {selectedRun && (
          <AutonomousRunDetailModal
            run={selectedRun}
            onClose={() => setSelectedRun(null)}
            onApprove={handleApprove}
            onExecute={handleExecuteRequest}
            approving={approving}
            executing={executing}
          />
        )}
        {confirmExecuteRun && (
          <ExecutionConfirmModal
            run={confirmExecuteRun}
            onConfirm={handleExecuteConfirm}
            onCancel={() => setConfirmExecuteRun(null)}
            loading={executing === confirmExecuteRun?.id}
          />
        )}
      </div>
    </div>
  );
}