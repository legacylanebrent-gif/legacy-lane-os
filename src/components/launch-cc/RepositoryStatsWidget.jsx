import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Database, RefreshCw } from 'lucide-react';

export default function RepositoryStatsWidget() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [total, approved, reviewNeeded, brands, categories, territories] = await Promise.all([
        base44.entities.ItemKnowledge.list('-created_date', 1).then(r => r.length).catch(() => 0),
        base44.entities.ItemKnowledge.filter({ public_status: 'approved_public' }).then(r => r.length).catch(() => 0),
        base44.entities.ItemKnowledge.filter({ public_status: 'review_needed' }).then(r => r.length).catch(() => 0),
        base44.entities.SEOBrandHub.list('-created_date', 1).then(r => r.length).catch(() => 0),
        base44.entities.SEOCategoryHub.list('-created_date', 1).then(r => r.length).catch(() => 0),
        base44.entities.TerritoryLaunch.list('-created_date', 1).then(r => r.length).catch(() => 0),
      ]);
      setStats({ total, approved, reviewNeeded, brands, categories, territories });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const rows = [
    { label: 'Total Records', value: stats.total },
    { label: 'Approved Public', value: stats.approved },
    { label: 'Review Needed', value: stats.reviewNeeded },
    { label: 'Brands', value: stats.brands },
    { label: 'Categories', value: stats.categories },
    { label: 'Territories', value: stats.territories },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Repository Stats</h3>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-800">
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-sm font-bold text-white">{loading ? '…' : (value ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}