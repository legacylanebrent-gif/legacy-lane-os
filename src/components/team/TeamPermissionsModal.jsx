import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Shield } from 'lucide-react';

const PERMISSION_GROUPS = [
  {
    label: 'Sales Management',
    permissions: [
      { key: 'MySales', label: 'View My Sales', description: 'See the sales dashboard' },
      { key: 'SaleEditor', label: 'Create / Edit Sales', description: 'Create and edit estate sale listings' },
      { key: 'SaleInventory', label: 'Inventory', description: 'Manage sale inventory items' },
      { key: 'Worksheet', label: 'POS / Worksheet', description: 'Access the point-of-sale worksheet' },
      { key: 'Attendance', label: 'Attendance', description: 'Track visitor attendance' },
    ]
  },
  {
    label: 'Operations',
    permissions: [
      { key: 'SaleTasks', label: 'Tasks', description: 'Manage sale tasks and checklists' },
      { key: 'SaleContracts', label: 'Contracts', description: 'View and manage contracts' },
      { key: 'SaleStatistics', label: 'Statistics', description: 'View sale analytics and stats' },
      { key: 'SaleExport', label: 'Export', description: 'Export sale data and reports' },
      { key: 'PrintSigns', label: 'Print Signs', description: 'Generate and print sale signs' },
    ]
  },
  {
    label: 'Marketing & Events',
    permissions: [
      { key: 'SaleMarketingCampaigns', label: 'Marketing Campaigns', description: 'Manage marketing campaigns' },
      { key: 'Campaigns', label: 'Campaigns Hub', description: 'Access the campaigns dashboard' },
      { key: 'VIPEvent', label: 'VIP Events', description: 'Create and manage VIP pre-sale events' },
      { key: 'Buyouts', label: 'Buyouts', description: 'Manage buyout offers' },
    ]
  },
  {
    label: 'Finance & Admin',
    permissions: [
      { key: 'IncomeTracker', label: 'Income Tracker', description: 'View income records' },
      { key: 'MyBusinessExpenses', label: 'Business Expenses', description: 'Manage business expenses' },
      { key: 'ApiKeyManager', label: 'Website API', description: 'Access API key and webhook settings' },
      { key: 'CRM', label: 'CRM', description: 'Access the customer relationship manager' },
    ]
  }
];

const ROLE_DEFAULTS = {
  team_admin: {
    MySales: true, SaleEditor: true, SaleInventory: true, Worksheet: true,
    Attendance: true, SaleTasks: true, SaleContracts: true, SaleStatistics: true,
    SaleExport: true, PrintSigns: true, SaleMarketingCampaigns: true,
    Campaigns: true, VIPEvent: true, Buyouts: true, IncomeTracker: true,
    MyBusinessExpenses: true, ApiKeyManager: true, CRM: true
  },
  team_member: {
    MySales: true, SaleInventory: true, Worksheet: true, Attendance: true,
    SaleTasks: true, PrintSigns: true
  },
  team_marketer: {
    MySales: true, SaleMarketingCampaigns: true, Campaigns: true,
    SaleStatistics: true, PrintSigns: true, VIPEvent: true
  }
};

export default function TeamPermissionsModal({ open, onClose, teamMember, onSuccess }) {
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teamMember) {
      const role = teamMember.primary_account_type;
      const defaults = ROLE_DEFAULTS[role] || {};
      const existing = teamMember.team_permissions || {};
      // Merge: use existing if set, else use role defaults
      const merged = {};
      PERMISSION_GROUPS.forEach(group => {
        group.permissions.forEach(p => {
          merged[p.key] = p.key in existing ? existing[p.key] : (defaults[p.key] || false);
        });
      });
      setPermissions(merged);
    }
  }, [teamMember]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.User.update(teamMember.id, { team_permissions: permissions });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    const role = teamMember?.primary_account_type;
    const defaults = ROLE_DEFAULTS[role] || {};
    const reset = {};
    PERMISSION_GROUPS.forEach(group => {
      group.permissions.forEach(p => {
        reset[p.key] = defaults[p.key] || false;
      });
    });
    setPermissions(reset);
  };

  const toggleAll = (value) => {
    const all = {};
    PERMISSION_GROUPS.forEach(group => {
      group.permissions.forEach(p => { all[p.key] = value; });
    });
    setPermissions(all);
  };

  if (!teamMember) return null;

  const roleLabel = teamMember.primary_account_type?.replace(/_/g, ' ');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            Manage Permissions — {teamMember.full_name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-orange-100 text-orange-700">{roleLabel}</Badge>
            <span className="text-sm text-slate-500">{teamMember.email}</span>
          </div>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Disable All</Button>
            <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Enable All</Button>
            <Button variant="outline" size="sm" onClick={handleResetToDefaults}>Reset to Defaults</Button>
          </div>

          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b">
                <h3 className="font-semibold text-slate-700 text-sm">{group.label}</h3>
              </div>
              <div className="divide-y">
                {group.permissions.map(p => (
                  <div key={p.key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.label}</p>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </div>
                    <Switch
                      checked={permissions[p.key] || false}
                      onCheckedChange={(val) => setPermissions({ ...permissions, [p.key]: val })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}