import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

export default function LeadFunnel() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const allLeads = await base44.entities.Lead.list('-created_date', 100);
      setLeads(allLeads || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const funnelStages = [
    { key: 'all', label: 'All Leads', filter: () => true },
    { key: 'contacted', label: 'Contacted', filter: (l) => l.contacted },
    { key: 'qualified', label: 'Qualified', filter: (l) => l.contacted && l.situation },
    { key: 'engaged', label: 'Engaged', filter: (l) => l.contacted && l.situation && l.timeline !== 'exploring' },
    { key: 'converted', label: 'Converted', filter: (l) => l.converted }
  ];

  const stageCounts = funnelStages.map(stage => ({
    ...stage,
    count: leads.filter(stage.filter).length
  }));

  const conversionRate = leads.length > 0 
    ? ((stageCounts.find(s => s.key === 'converted').count / leads.length) * 100).toFixed(1)
    : 0;

  const avgValue = leads.length > 0
    ? (leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0) / leads.length).toLocaleString()
    : 0;

  if (loading) return <div className="p-8 text-center">Loading funnel...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="w-8 h-8" />
          Lead Funnel Analytics
        </h1>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Leads</div>
            <div className="text-3xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Conversion Rate</div>
            <div className="text-3xl font-bold text-green-600">{conversionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Avg Lead Value</div>
            <div className="text-2xl font-bold text-blue-600">${avgValue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stageCounts.map((stage, idx) => {
              const percent = leads.length > 0 ? (stage.count / leads.length) * 100 : 0;
              const width = Math.max(percent, 5);
              return (
                <div key={stage.key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{stage.count} leads</span>
                      <Badge>{percent.toFixed(0)}%</Badge>
                    </div>
                  </div>
                  <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Drop-off Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Drop-off Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stageCounts.map((stage, idx) => {
              if (idx === stageCounts.length - 1) return null;
              const current = stage.count;
              const next = stageCounts[idx + 1].count;
              const dropOff = current - next;
              const dropOffPercent = current > 0 ? ((dropOff / current) * 100).toFixed(1) : 0;
              
              return (
                <div key={stage.key} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{stage.label} → {stageCounts[idx + 1].label}</span>
                  <Badge variant="outline" className="text-red-600">
                    {dropOff} dropped ({dropOffPercent}%)
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}