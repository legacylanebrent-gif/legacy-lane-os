import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const READINESS_CONFIG = {
  green: { label: 'Ready for Export', color: 'bg-green-100 text-green-700 border-green-300', icon: 'CheckCircle2' },
  yellow: { label: 'Export Possible — Cleanup Recommended', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: 'AlertTriangle' },
  red: { label: 'Blocked — Critical Issues', color: 'bg-red-100 text-red-700 border-red-300', icon: 'XCircle' },
};

export function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value?.toLocaleString()}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="bg-white shadow-sm mt-4">
      <CardHeader>
        <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-slate-500" />
            <CardTitle className="text-sm">{title}</CardTitle>
            {count !== undefined && <Badge className="text-xs bg-slate-100 text-slate-600">{count}</Badge>}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
      </CardHeader>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="text-center py-8">
      <Icon className="w-8 h-8 text-green-500 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}