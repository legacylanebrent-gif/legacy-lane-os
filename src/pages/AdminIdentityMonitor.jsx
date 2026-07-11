import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, Users, AlertTriangle, CheckCircle, RefreshCw, Zap, Eye } from "lucide-react";

export default function AdminIdentityMonitor() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState([]);
  const [backfillResult, setBackfillResult] = useState(null);
  const [backfillLoading, setBackfillLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Users missing masterUserID or with pending/retrying/failed status
      const [pending, retrying, failed, reviewRequired, resolvedUsers] = await Promise.all([
        base44.entities.User.filter({ identityResolutionStatus: "pending" }, "-created_date", 50).catch(() => []),
        base44.entities.User.filter({ identityResolutionStatus: "retrying" }, "-created_date", 50).catch(() => []),
        base44.entities.User.filter({ identityResolutionStatus: "failed" }, "-created_date", 50).catch(() => []),
        base44.entities.User.filter({ identityResolutionStatus: "review_required" }, "-created_date", 50).catch(() => []),
        base44.entities.User.filter({ identityResolutionStatus: "resolved" }, "-created_date", 10).catch(() => []),
      ]);

      setUsers({
        pending, retrying, failed, reviewRequired, resolved: resolvedUsers,
      });

      const errorQueue = await base44.entities.IdentitySyncError.filter(
        { resolutionStatus: "pending_retry" }, "-created_date", 50
      ).catch(() => []);
      setErrors(errorQueue);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runBackfill = async (dryRun = false) => {
    setBackfillLoading(true);
    try {
      const res = await base44.functions.invoke("backfillUserIdentities", {
        dryRun,
        limit: 50,
      });
      setBackfillResult(res.data);
      if (!dryRun) loadData();
    } catch (e) {
      setBackfillResult({ success: false, error: e.message });
    } finally {
      setBackfillLoading(false);
    }
  };

  const resolveUser = async (userId) => {
    try {
      await base44.functions.invoke("resolveUserIdentity", {
        action: "resolve",
        localUserID: userId,
      });
      loadData();
    } catch (e) {
      console.error("Resolve failed:", e);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const stats = [
    { label: "Pending", count: users.pending?.length || 0, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Retrying", count: users.retrying?.length || 0, icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Failed", count: users.failed?.length || 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Review Required", count: users.reviewRequired?.length || 0, icon: Eye, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Resolved", count: users.resolved?.length || 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Error Queue", count: errors.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  const renderUserRow = (u) => (
    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2 text-sm text-slate-700">{u.full_name || u.email || u.id}</td>
      <td className="px-3 py-2 text-sm text-slate-500">{u.email || "—"}</td>
      <td className="px-3 py-2 text-sm font-mono text-slate-600">{u.masterUserID ? `${u.masterUserID.slice(0, 12)}…` : "—"}</td>
      <td className="px-3 py-2">
        <Badge variant={u.identityResolutionStatus === "resolved" ? "default" : "secondary"} className="text-xs">
          {u.identityResolutionStatus || "pending"}
        </Badge>
      </td>
      <td className="px-3 py-2 text-sm text-slate-400 max-w-[200px] truncate">{u.identitySyncError || "—"}</td>
      <td className="px-3 py-2">
        {u.identityResolutionStatus !== "resolved" && (
          <Button size="sm" variant="outline" onClick={() => resolveUser(u.id)}>
            <Zap className="w-3 h-3 mr-1" /> Resolve
          </Button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cross-Platform Identity Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">Master User ID resolution via Houszu Central Identity Authority</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => runBackfill(true)} disabled={backfillLoading}>
            <Eye className="w-4 h-4 mr-2" /> Dry Run
          </Button>
          <Button onClick={() => runBackfill(false)} disabled={backfillLoading} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Zap className="w-4 h-4 mr-2" /> Run Backfill
          </Button>
          <Button variant="ghost" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-slate-200">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{s.count}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Backfill Result */}
      {backfillResult && (
        <Alert className={backfillResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <Activity className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">
                {backfillResult.dryRun ? "Dry Run" : "Backfill"} — {backfillResult.processed || 0} users processed
              </div>
              {backfillResult.counts && (
                <div className="text-sm text-slate-600">
                  Resolved: {backfillResult.counts.resolved} | Created: {backfillResult.counts.created} | Matched: {backfillResult.counts.matched} | Failed: {backfillResult.counts.failed} | Review: {backfillResult.counts.reviewRequired} | Unverified: {backfillResult.counts.unverified}
                </div>
              )}
              {backfillResult.hasMore && (
                <div className="text-sm text-amber-700">More users remain — run backfill again to continue.</div>
              )}
              {backfillResult.error && <div className="text-sm text-red-700">{backfillResult.error}</div>}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending / Retrying Users */}
      {(users.pending?.length > 0 || users.retrying?.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pending & Retrying Identity Resolution</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2">User</th><th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Master User ID</th><th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Error</th><th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(users.pending || []), ...(users.retrying || [])].slice(0, 50).map(renderUserRow)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Users */}
      {users.failed?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-red-700">Failed Identity Resolution</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2">User</th><th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th><th className="px-3 py-2">Error</th><th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.failed || []).slice(0, 50).map(renderUserRow)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Required */}
      {users.reviewRequired?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-orange-700">Review Required — Ambiguous Identities</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2">User</th><th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Status</th><th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.reviewRequired || []).slice(0, 50).map(renderUserRow)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Queue */}
      {errors.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Identity Sync Error Queue</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2">User ID</th><th className="px-3 py-2">Masked Email</th>
                    <th className="px-3 py-2">Reason</th><th className="px-3 py-2">Retries</th>
                    <th className="px-3 py-2">Next Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm font-mono text-slate-600">{e.localUserID?.slice(0, 12)}…</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{e.maskedEmail || "—"}</td>
                      <td className="px-3 py-2 text-sm text-slate-600 max-w-[300px] truncate">{e.failureReason}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{e.retryCount}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{e.nextRetryTime ? new Date(e.nextRetryTime).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recently Resolved */}
      {users.resolved?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-green-700">Recently Connected Cross-Platform Users</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2">User</th><th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Master User ID</th><th className="px-3 py-2">Resolved At</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.resolved || []).slice(0, 10).map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm text-slate-700">{u.full_name || u.email || u.id}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{u.email || "—"}</td>
                      <td className="px-3 py-2 text-sm font-mono text-green-700">{u.masterUserID?.slice(0, 16)}…</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{u.identityResolvedAt ? new Date(u.identityResolvedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}