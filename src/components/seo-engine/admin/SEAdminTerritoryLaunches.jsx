import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Rocket } from 'lucide-react';
import TerritoryLaunchForm from './TerritoryLaunchForm';
import TerritoryLaunchTable from './TerritoryLaunchTable';

export default function SEAdminTerritoryLaunches({ territories, onRefresh }) {
  const [showForm, setShowForm] = useState(false);

  const published = territories.filter(t => t.launch_status === 'published').length;
  const draft = territories.filter(t => t.launch_status === 'draft' || t.launch_status === 'review').length;
  const totalPages = territories.reduce((sum, t) => sum + (t.pages_created_json?.length || 0), 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Territories', value: territories.length },
          { label: 'Published', value: published },
          { label: 'Pages Created', value: totalPages },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">Territory Launches</h2>
          <p className="text-xs text-slate-500 mt-0.5">Each territory creates county guides, routing rules, and sitemap entries.</p>
        </div>
        <Button
          onClick={() => setShowForm(v => !v)}
          className="bg-slate-800 hover:bg-slate-900 text-white gap-2"
          size="sm"
        >
          {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> New Territory Launch</>}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-slate-200 rounded-xl bg-white">
          <div className="flex items-center gap-2 px-6 pt-5 pb-2">
            <Rocket className="w-4 h-4 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Launch New Territory</h3>
          </div>
          <TerritoryLaunchForm
            onSuccess={() => { setShowForm(false); onRefresh(); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Table */}
      <TerritoryLaunchTable territories={territories} onRefresh={onRefresh} />
    </div>
  );
}