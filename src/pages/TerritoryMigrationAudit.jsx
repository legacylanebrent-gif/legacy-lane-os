import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw, MapPin, Building2, AlertTriangle, CheckCircle2, XCircle,
  Download, FileText, Database, GitBranch, Navigation, Loader2, Mail, Layers
} from 'lucide-react';
import { StatCard, CollapsibleSection, EmptyState } from '@/components/audit/AuditShared';

const READINESS_ICONS = { green: CheckCircle2, yellow: AlertTriangle, red: XCircle };
const READINESS_STYLES = {
  green: { label: 'Ready for Export', color: 'bg-green-100 text-green-700 border-green-300' },
  yellow: { label: 'Export Possible — Cleanup Recommended', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  red: { label: 'Blocked — Critical Issues', color: 'bg-red-100 text-red-700 border-red-300' },
};

export default function TerritoryMigrationAudit() {
  const [audits, setAudits] = useState([]);
  const [latestAudit, setLatestAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadAudits(); }, []);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.TerritoryMigrationAuditResult.list('-audit_date', 10);
      setAudits(results);
      if (results.length > 0) setLatestAudit(results[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runAudit = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('territoryMigrationAudit', {});
      if (res.data?.success) {
        await loadAudits();
      } else {
        alert('Audit failed: ' + (res.data?.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Audit failed: ' + e.message);
    } finally { setRunning(false); }
  };

  const exportData = async () => {
    if (!latestAudit?.ready_for_houszu_export) {
      alert('Export is not available — audit must pass before export is enabled.');
      return;
    }
    setExporting(true);
    try {
      const preview = latestAudit.export_preview || [];
      if (preview.length === 0) {
        alert('No export data available. Run the audit first.');
        return;
      }

      const headers = [
        'Territory ID', 'Territory Name', 'Territory Type', 'State', 'County', 'City', 'ZIP Codes',
        'Micro-Territory ID', 'Micro-Territory Name', 'Parent Territory ID',
        'Latitude', 'Longitude', 'Geocoding Source', 'Last Geocoded Date',
        'Active', 'Created Date', 'Updated Date'
      ];
      const rows = preview.map(r => [
        r.territory_id || '', r.territory_name || '', r.territory_type || '',
        r.state || '', r.county || '', r.city || '', r.zip_codes || '',
        r.micro_territory_id || '', r.micro_territory_name || '', r.parent_territory_id || '',
        r.latitude || '', r.longitude || '', r.geocoding_source || '', r.last_geocoded_date || '',
        r.is_active ? 'Yes' : 'No', r.created_date || '', r.updated_date || '',
      ]);

      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `territory_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally { setExporting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const readiness = latestAudit?.export_readiness || 'red';
  const ReadinessIcon = READINESS_ICONS[readiness] || XCircle;
  const readinessStyle = READINESS_STYLES[readiness] || READINESS_STYLES.red;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Territory Migration Audit</h1>
              <p className="text-sm text-slate-500">
                Pre-export verification for Houszu migration
                {latestAudit && ` · Last audit: ${new Date(latestAudit.audit_date).toLocaleString()}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={runAudit} disabled={running} className="bg-purple-600 hover:bg-purple-700">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {running ? 'Running Audit...' : 'Run Full Audit'}
            </Button>
            <Button
              onClick={exportData}
              disabled={exporting || !latestAudit?.ready_for_houszu_export}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export for Houszu
            </Button>
          </div>
        </div>

        {!latestAudit ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Audit Run Yet</h3>
              <p className="text-slate-500 mb-4">Click "Run Full Audit" to verify all territory and micro-territory data before exporting to Houszu.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Export Readiness Banner */}
            <div className={`mb-6 p-4 rounded-xl border-2 ${readinessStyle.color}`}>
              <div className="flex items-center gap-3">
                <ReadinessIcon className="w-6 h-6 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold">{readinessStyle.label}</h2>
                  <p className="text-sm opacity-90">{latestAudit.export_readiness_label}</p>
                </div>
                <Badge className={`text-sm px-3 py-1 ${latestAudit.ready_for_houszu_export ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                  {latestAudit.ready_for_houszu_export ? '✓ Safe to Export' : '✗ Not Safe'}
                </Badge>
              </div>
            </div>

            {/* Summary Stats — Row 1: Core counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
              <StatCard label="Territories" value={latestAudit.total_territories} icon={MapPin} color="bg-orange-500" />
              <StatCard label="Active" value={latestAudit.total_active_territories} icon={CheckCircle2} color="bg-green-500" />
              <StatCard label="Micro-Territories" value={latestAudit.total_micro_territories} icon={Building2} color="bg-purple-500" />
              <StatCard label="Total Cities" value={latestAudit.total_cities} icon={Building2} color="bg-indigo-500" />
              <StatCard label="Total ZIPs" value={latestAudit.total_zip_codes} icon={Mail} color="bg-blue-500" />
              <StatCard label="Zero Micros" value={latestAudit.territories_with_zero_micros} icon={AlertTriangle} color="bg-amber-500" />
              <StatCard label="Orphaned" value={latestAudit.orphaned_micro_territories} icon={AlertTriangle} color="bg-red-500" />
            </div>

            {/* Summary Stats — Row 2: Issues */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              <StatCard label="Dup. Territories" value={latestAudit.duplicate_territories} icon={Layers} color="bg-red-500" />
              <StatCard label="Dup. Micros" value={latestAudit.duplicate_micro_territories} icon={Layers} color="bg-red-500" />
              <StatCard label="Conflicting Parents" value={latestAudit.conflicting_parent_count} icon={GitBranch} color="bg-red-500" />
              <StatCard label="Dup. Coordinates" value={latestAudit.duplicate_coordinates_count} icon={Navigation} color="bg-amber-500" />
              <StatCard label="Coords Outside State" value={latestAudit.coords_outside_state_count} icon={MapPin} color="bg-amber-500" />
              <StatCard label="ZIP Mismatches" value={latestAudit.zip_mismatch_count} icon={Mail} color="bg-amber-500" />
              <StatCard label="Missing Geocoding" value={latestAudit.micros_missing_geocoding} icon={Navigation} color="bg-red-600" />
            </div>

            {/* Summary Stats — Row 3: Export readiness */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard label="Valid Geocoding" value={latestAudit.micros_with_valid_geocoding} icon={CheckCircle2} color="bg-green-600" />
              <StatCard label="Ready for Export" value={latestAudit.records_ready_for_export} icon={CheckCircle2} color="bg-green-600" />
              <StatCard label="Blocked" value={latestAudit.records_blocked_from_export} icon={XCircle} color="bg-red-600" />
            </div>

            {/* Data Availability Indicators */}
            <Card className="bg-white shadow-sm mb-6">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Data Field Availability</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className={latestAudit.geocoding_source_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    Geocoding Source: {latestAudit.geocoding_source_available ? 'Available' : 'Not Available'}
                  </Badge>
                  <Badge className={latestAudit.last_geocoded_date_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    Last Geocoded Date: {latestAudit.last_geocoded_date_available ? 'Available' : 'Not Available'}
                  </Badge>
                  <Badge className={latestAudit.polygon_data_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    Polygon/Boundary Data: {latestAudit.polygon_data_available ? 'Available' : 'Not Available'}
                  </Badge>
                  <Badge className={latestAudit.territory_type_available ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                    Territory Type: {latestAudit.territory_type_available ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Fixes Needed */}
            {latestAudit.fixes_needed?.length > 0 && (
              <Alert className="mb-6 border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription>
                  <p className="font-semibold text-amber-800 mb-2">Fixes Needed Before Export:</p>
                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                    {latestAudit.fixes_needed.map((fix, i) => <li key={i}>{fix}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* State Breakdown */}
            <CollapsibleSection title="State-by-State Breakdown" icon={MapPin} count={latestAudit.state_breakdown?.length} defaultOpen>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Territories</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Micros</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">ZIPs</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Geocoded</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Missing Geo</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Orphaned</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Duplicates</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Coords Outside State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestAudit.state_breakdown?.map(s => (
                      <tr key={s.state} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{s.state}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{s.territory_count}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{s.micro_count}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{s.zip_count}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{s.geocoded_count}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-medium">{s.missing_geocoding}</td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">{s.orphaned_micros}</td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">{s.duplicates}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-medium">{s.coords_outside_state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* County Breakdown */}
            <CollapsibleSection title="County-by-County Breakdown" icon={Building2} count={latestAudit.county_breakdown?.length}>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Territories</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Micros</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">ZIPs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestAudit.county_breakdown?.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">{c.state}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{c.county}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{c.territory_count}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{c.micro_count}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{c.zip_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Territory → Micro-Territory Count */}
            <CollapsibleSection title="Territory to Micro-Territory Count" icon={GitBranch} count={latestAudit.territory_micro_counts?.length}>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Territory</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">ZIPs</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Micro Count</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600">Active</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestAudit.territory_micro_counts?.map(t => (
                      <tr key={t.territory_id} className={`border-b border-slate-50 ${!t.has_micros ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-xs">{t.territory_name || t.territory_id}</td>
                        <td className="px-3 py-2 text-slate-600">{t.state}</td>
                        <td className="px-3 py-2 text-slate-600">{t.county}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{t.zip_count}</td>
                        <td className="px-3 py-2 text-right text-slate-700 font-medium">{t.micro_count}</td>
                        <td className="px-3 py-2 text-center">{t.is_active ? <CheckCircle2 className="w-4 h-4 text-green-500 inline" /> : <XCircle className="w-4 h-4 text-red-400 inline" />}</td>
                        <td className="px-3 py-2 text-center">
                          {t.has_micros
                            ? <Badge className="bg-green-100 text-green-700 text-xs">Has Micros</Badge>
                            : <Badge className="bg-amber-100 text-amber-700 text-xs">Zero Micros</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Geocoding Issues */}
            <CollapsibleSection title="Geocoding Issues" icon={Navigation} count={latestAudit.geocoding_issues?.length}>
              {latestAudit.geocoding_issues?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No geocoding issues found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro-Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Issue Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.geocoding_issues?.slice(0, 200).map((g, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{g.micro_territory_id}</td>
                          <td className="px-3 py-2 text-slate-600">{g.state}</td>
                          <td className="px-3 py-2 text-slate-600">{g.county}</td>
                          <td className="px-3 py-2"><Badge className="bg-amber-100 text-amber-700 text-xs">{g.issue_type}</Badge></td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{g.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {latestAudit.geocoding_issues?.length > 200 && (
                    <p className="text-center text-xs text-slate-400 py-2">Showing first 200 of {latestAudit.geocoding_issues.length} issues</p>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Duplicate Records */}
            <CollapsibleSection title="Duplicate Records" icon={Layers} count={latestAudit.duplicate_records?.length}>
              {latestAudit.duplicate_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No duplicates found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Key</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Count</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Record IDs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.duplicate_records?.map((d, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2"><Badge className="bg-red-100 text-red-700 text-xs">{d.record_type}</Badge></td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{d.key}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-medium">{d.count}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-400 truncate max-w-xs">{d.record_ids?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Conflicting Parent Records */}
            <CollapsibleSection title="Conflicting Parent Territories" icon={GitBranch} count={latestAudit.conflicting_parent_records?.length}>
              {latestAudit.conflicting_parent_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No conflicting parent territories found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro-Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Parent Territory IDs</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.conflicting_parent_records?.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.micro_territory_id}</td>
                          <td className="px-3 py-2 font-mono text-xs text-red-600">{c.parent_territory_ids?.join(', ')}</td>
                          <td className="px-3 py-2 text-slate-600">{c.state}</td>
                          <td className="px-3 py-2 text-slate-600">{c.county}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Duplicate Coordinates */}
            <CollapsibleSection title="Duplicate Coordinates" icon={Navigation} count={latestAudit.duplicate_coordinate_records?.length}>
              {latestAudit.duplicate_coordinate_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No duplicate coordinates found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Latitude</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Longitude</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Count</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro-Territory IDs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.duplicate_coordinate_records?.map((d, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 text-right text-slate-700">{d.lat}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{d.lng}</td>
                          <td className="px-3 py-2 text-right text-amber-600 font-medium">{d.count}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-400 truncate max-w-xs">{d.micro_territory_ids?.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Coords Outside State */}
            <CollapsibleSection title="Coordinates Outside Expected State" icon={MapPin} count={latestAudit.coords_outside_state_records?.length}>
              {latestAudit.coords_outside_state_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No coordinates outside expected state boundaries." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro-Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Lat</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Lng</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Expected Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.coords_outside_state_records?.map((c, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{c.micro_territory_id}</td>
                          <td className="px-3 py-2 text-slate-600">{c.state}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{c.lat}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{c.lng}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{c.expected_range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* ZIP Mismatches */}
            <CollapsibleSection title="ZIP Code / State Mismatches" icon={Mail} count={latestAudit.zip_mismatch_records?.length}>
              {latestAudit.zip_mismatch_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No ZIP code mismatches found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Invalid ZIPs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.zip_mismatch_records?.map((z, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{z.territory_id}</td>
                          <td className="px-3 py-2 text-slate-600">{z.state}</td>
                          <td className="px-3 py-2">{z.invalid_zips?.map(zip => <Badge key={zip} className="bg-red-100 text-red-700 text-xs mr-1">{zip}</Badge>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Orphaned Records */}
            <CollapsibleSection title="Orphaned Micro-Territories" icon={AlertTriangle} count={latestAudit.orphaned_records?.length}>
              {latestAudit.orphaned_records?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No orphaned records found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro-Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Parent Territory ID (missing)</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.orphaned_records?.map((o, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{o.micro_territory_id}</td>
                          <td className="px-3 py-2 font-mono text-xs text-red-600">{o.territory_id}</td>
                          <td className="px-3 py-2 text-slate-600">{o.state}</td>
                          <td className="px-3 py-2 text-slate-600">{o.county}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Missing Data */}
            <CollapsibleSection title="Missing Data Records" icon={FileText} count={latestAudit.missing_data?.length}>
              {latestAudit.missing_data?.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No missing data found." />
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Record ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Missing Fields</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.missing_data?.map((m, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-3 py-2"><Badge className="bg-amber-100 text-amber-700 text-xs">{m.record_type}</Badge></td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600">{m.record_id}</td>
                          <td className="px-3 py-2">{m.missing_fields?.map(f => <Badge key={f} className="bg-red-100 text-red-700 text-xs mr-1">{f}</Badge>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleSection>

            {/* Export Preview */}
            <CollapsibleSection title="Export Preview (Houszu Migration Format)" icon={Download} count={latestAudit.export_preview?.length}>
              {latestAudit.export_preview?.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No export records available.</p>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Territory ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Territory Name</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">State</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">County</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">City</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">ZIPs</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro ID</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Micro Name</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Lat</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Lng</th>
                        <th className="text-center px-3 py-2 font-semibold text-slate-600">Ready</th>
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Block Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestAudit.export_preview?.slice(0, 100).map((r, i) => (
                        <tr key={i} className={`border-b border-slate-50 ${!r.ready_for_export ? 'bg-red-50/50' : ''}`}>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600 truncate max-w-[120px]">{r.territory_id}</td>
                          <td className="px-3 py-2 text-slate-900 truncate max-w-[120px]">{r.territory_name}</td>
                          <td className="px-3 py-2 text-slate-600">{r.state}</td>
                          <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{r.county}</td>
                          <td className="px-3 py-2 text-slate-600">{r.city}</td>
                          <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-[80px]">{r.zip_codes}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-600 truncate max-w-[100px]">{r.micro_territory_id}</td>
                          <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{r.micro_territory_name}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-500">{r.latitude || '—'}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-500">{r.longitude || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            {r.ready_for_export
                              ? <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                              : <XCircle className="w-4 h-4 text-red-400 inline" />}
                          </td>
                          <td className="px-3 py-2 text-xs text-red-500 truncate max-w-[150px]">{r.block_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {latestAudit.export_preview?.length > 100 && (
                    <p className="text-center text-xs text-slate-400 py-2">Showing first 100 of {latestAudit.export_preview.length} records (full data in CSV export)</p>
                  )}
                </div>
              )}
            </CollapsibleSection>

            {/* Previous Audits */}
            {audits.length > 1 && (
              <Card className="bg-white shadow-sm mt-4">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 text-slate-400" /> Audit History</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {audits.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                        <span className="text-slate-600">{new Date(a.audit_date).toLocaleString()}</span>
                        <span className="text-slate-500">{a.total_territories} territories · {a.total_micro_territories} micros</span>
                        <Badge className={`text-xs ${READINESS_STYLES[a.export_readiness]?.color || ''}`}>
                          {READINESS_STYLES[a.export_readiness]?.label || a.export_readiness}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}