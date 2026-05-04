import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { isAdminUser } from '@/lib/isAdminUser';
import AdminAICommandConsole from '@/components/adminai/AdminAICommandConsole';
import AdminAIOutputPanel from '@/components/adminai/AdminAIOutputPanel';
import AdminAIReportHistory from '@/components/adminai/AdminAIReportHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, History, AlertTriangle, Settings } from 'lucide-react';
import AgentChainIndicator from '@/components/adminai/AgentChainIndicator';
import AdminAISettingsPanel from '@/components/adminai/AdminAISettingsPanel';

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

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (me && isAdminUser(me)) {
          loadReports();
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
          <TabsList className="bg-slate-800/60 border border-slate-700 mb-6">
            <TabsTrigger value="command" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400">
              <Brain className="w-3.5 h-3.5 mr-1.5" />Command Console
            </TabsTrigger>
            <TabsTrigger value="output" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400" disabled={!result}>
              Output Panel
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-slate-400">
              <History className="w-3.5 h-3.5 mr-1.5" />Run History ({reports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="command">
            <div className="space-y-4">
              <AgentChainIndicator running={running} />
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
                <AdminAICommandConsole onSubmit={handleSubmit} loading={running} />
              </div>
              <AdminAISettingsPanel user={user} />
            </div>
          </TabsContent>

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

          <TabsContent value="history">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Previous AI Reports</h3>
                <button onClick={loadReports} className="text-xs text-amber-400 hover:text-amber-300">↻ Refresh</button>
              </div>
              <AdminAIReportHistory reports={reports} onView={handleViewReport} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}