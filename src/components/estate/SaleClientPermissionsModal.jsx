import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X, Plus, UserPlus } from 'lucide-react';

const AVAILABLE_PAGES = [
  { name: 'SaleInventory', label: 'View Inventory' },
  { name: 'SaleStatistics', label: 'View Statistics' },
  { name: 'Attendance', label: 'View Attendance' },
  { name: 'SaleTasks', label: 'View Tasks' },
  { name: 'Worksheet', label: 'View Worksheet' },
  { name: 'SaleContracts', label: 'View Contracts' }
];

export default function SaleClientPermissionsModal({ open, onClose, saleId }) {
  const [clients, setClients] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState('');
  const [selectedPages, setSelectedPages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && saleId) {
      loadData();
    }
  }, [open, saleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      
      // Load existing client permissions for this sale
      const permissions = await base44.entities.SaleClientPermission.filter({ sale_id: saleId });
      setClients(permissions);

      // Load user's connections to select from
      const userConnections = await base44.entities.Connection.filter({ 
        account_owner_id: user.id 
      });
      setConnections(userConnections);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!selectedConnection || selectedPages.length === 0) {
      alert('Please select a client and at least one page');
      return;
    }

    setSaving(true);
    try {
      const connection = connections.find(c => c.id === selectedConnection);
      
      await base44.entities.SaleClientPermission.create({
        sale_id: saleId,
        client_user_id: connection.connected_user_id,
        client_name: connection.connected_user_name,
        client_email: connection.connected_user_email,
        allowed_pages: selectedPages,
        status: 'active'
      });

      setShowAddClient(false);
      setSelectedConnection('');
      setSelectedPages([]);
      await loadData();
    } catch (error) {
      console.error('Error adding client:', error);
      alert('Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePages = async (clientId, currentPages, pageName, checked) => {
    const newPages = checked 
      ? [...currentPages, pageName]
      : currentPages.filter(p => p !== pageName);

    try {
      await base44.entities.SaleClientPermission.update(clientId, {
        allowed_pages: newPages
      });
      await loadData();
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const handleRemoveClient = async (clientId) => {
    if (!window.confirm('Remove this client\'s access?')) return;

    try {
      await base44.entities.SaleClientPermission.delete(clientId);
      await loadData();
    } catch (error) {
      console.error('Error removing client:', error);
      alert('Failed to remove client');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Client Permissions</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Existing Clients */}
            {clients.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Assigned Clients</h3>
                {clients.map(client => (
                  <div key={client.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{client.client_name}</p>
                        <p className="text-sm text-slate-600">{client.client_email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveClient(client.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-600">Page Access</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_PAGES.map(page => (
                          <div key={page.name} className="flex items-center gap-2">
                            <Checkbox
                              id={`${client.id}-${page.name}`}
                              checked={client.allowed_pages?.includes(page.name)}
                              onCheckedChange={(checked) => 
                                handleUpdatePages(client.id, client.allowed_pages || [], page.name, checked)
                              }
                            />
                            <label 
                              htmlFor={`${client.id}-${page.name}`}
                              className="text-sm cursor-pointer"
                            >
                              {page.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Client */}
            {!showAddClient ? (
              <Button
                onClick={() => setShowAddClient(true)}
                variant="outline"
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            ) : (
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Add New Client</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddClient(false);
                      setSelectedConnection('');
                      setSelectedPages([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Select Client</Label>
                    <select
                      className="w-full border border-slate-300 rounded-md p-2 text-sm"
                      value={selectedConnection}
                      onChange={(e) => setSelectedConnection(e.target.value)}
                    >
                      <option value="">Choose a client...</option>
                      {connections
                        .filter(conn => !clients.some(c => c.client_user_id === conn.connected_user_id))
                        .map(conn => (
                          <option key={conn.id} value={conn.id}>
                            {conn.connected_user_name} ({conn.connected_user_email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <Label className="mb-2 block">Select Pages</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_PAGES.map(page => (
                        <div key={page.name} className="flex items-center gap-2">
                          <Checkbox
                            id={`new-${page.name}`}
                            checked={selectedPages.includes(page.name)}
                            onCheckedChange={(checked) => {
                              setSelectedPages(prev => 
                                checked 
                                  ? [...prev, page.name]
                                  : prev.filter(p => p !== page.name)
                              );
                            }}
                          />
                          <label 
                            htmlFor={`new-${page.name}`}
                            className="text-sm cursor-pointer"
                          >
                            {page.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleAddClient}
                    disabled={saving || !selectedConnection || selectedPages.length === 0}
                    className="w-full"
                  >
                    {saving ? 'Adding...' : 'Add Client'}
                  </Button>
                </div>
              </div>
            )}

            {connections.length === 0 && !loading && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No connections found. Add clients through your CRM first.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}