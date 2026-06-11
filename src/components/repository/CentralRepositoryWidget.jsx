import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Database, ArrowUpRight, CheckCircle, AlertCircle, Zap, DollarSign, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function CentralRepositoryWidget() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CentralRepositoryDailySnapshot.list('-snapshot_date', 1)
      .then(d => setSnapshot(d[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const s = snapshot || {};
  const readiness = s.launch_readiness_score || 0;
  const readinessColor = readiness >= 80 ? 'text-emerald-400' : readiness >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Central Repository — Daily Snapshot</h2>
        </div>
        <div className="flex items-center gap-2">
          {s.snapshot_date && <span className="text-xs text-slate-400">{s.snapshot_date}</span>}
          <Badge className="bg-slate-800 text-white text-xs">🔒 Private</Badge>
        </div>
      </div>

      {loading ? (
        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">Loading snapshot…</div>
      ) : !snapshot ? (
        <div className="h-24 flex items-center justify-center text-slate-400 text-sm">No snapshot yet — run the daily job to generate one.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-slate-800">{(s.total_item_count || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500">Total Items</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-emerald-700">+{s.new_items_added || 0}</div>
              <div className="text-xs text-slate-500">Added Yesterday</div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-emerald-700">{(s.approved_public_count || 0).toLocaleString()}</div>
              <div className="text-xs text-slate-500">Approved Public</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-amber-700">{s.review_needed_count || 0}</div>
              <div className="text-xs text-slate-500">Review Needed</div>
            </div>
            <div className="bg-violet-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-violet-700">{s.barcode_match_count || 0}</div>
              <div className="text-xs text-slate-500">Barcode Matches</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-blue-700">{s.database_match_count || 0}</div>
              <div className="text-xs text-slate-500">DB Matches</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Zap className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-700">{s.serpapi_lookup_avoided_count || 0} avoided</div>
                <div className="text-xs text-slate-400">SERPAPI lookups saved</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-700">${(s.estimated_serpapi_savings || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-400">Est. savings yesterday</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-700">{s.days_until_launch ?? '—'} days</div>
                <div className="text-xs text-slate-400">Until target launch</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Database className="w-4 h-4 text-violet-500 shrink-0" />
              <div>
                <div className={`text-xs font-bold ${readinessColor}`}>{readiness}% ready</div>
                <div className="text-xs text-slate-400">Launch readiness</div>
              </div>
            </div>
          </div>

          {/* Readiness bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Launch Readiness</span><span>{readiness}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${readiness >= 80 ? 'bg-emerald-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                style={{ width: `${readiness}%` }}
              />
            </div>
          </div>
        </>
      )}

      <Link to="/AdminCentralRepository">
        <Button variant="outline" size="sm" className="w-full text-xs border-violet-200 text-violet-600 hover:bg-violet-50 gap-1.5">
          <Database className="w-3.5 h-3.5" />View Repository <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}