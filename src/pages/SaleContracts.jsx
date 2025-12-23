import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, FileText, Download, Upload, Eye, Edit, Trash2, CheckCircle, Clock
} from 'lucide-react';

export default function SaleContracts() {
  const navigate = useNavigate();
  const [sale, setSale] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'estate_sale_agreement',
    party_name: '',
    party_email: '',
    party_phone: '',
    terms: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get('saleId');

      if (!saleId) {
        navigate(createPageUrl('MySales'));
        return;
      }

      const saleData = await base44.entities.EstateSale.filter({ id: saleId });
      if (saleData.length === 0) {
        navigate(createPageUrl('MySales'));
        return;
      }

      setSale(saleData[0]);

      // For now, using a custom attribute on EstateSale to store contracts
      // In production, you'd create a Contract entity
      setContracts(saleData[0].contracts || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      type: 'estate_sale_agreement',
      party_name: '',
      party_email: '',
      party_phone: '',
      terms: '',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newContract = {
        id: Date.now().toString(),
        ...formData,
        created_date: new Date().toISOString(),
        status: 'draft',
        signed: false
      };

      const updatedContracts = [...contracts, newContract];
      
      await base44.entities.EstateSale.update(sale.id, {
        contracts: updatedContracts
      });

      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Failed to create contract');
    }
  };

  const handleDelete = async (contractId) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      const updatedContracts = contracts.filter(c => c.id !== contractId);
      await base44.entities.EstateSale.update(sale.id, {
        contracts: updatedContracts
      });
      loadData();
    } catch (error) {
      console.error('Error deleting contract:', error);
      alert('Failed to delete contract');
    }
  };

  const handleStatusChange = async (contractId, newStatus) => {
    try {
      const updatedContracts = contracts.map(c => 
        c.id === contractId ? { ...c, status: newStatus, signed: newStatus === 'signed' } : c
      );
      await base44.entities.EstateSale.update(sale.id, {
        contracts: updatedContracts
      });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleView = (contract) => {
    setSelectedContract(contract);
    setShowViewModal(true);
  };

  const handleDownload = (contract) => {
    const content = `
ESTATE SALE CONTRACT
=====================

Title: ${contract.title}
Type: ${contract.type}
Date: ${new Date(contract.created_date).toLocaleDateString()}

PARTY INFORMATION:
Name: ${contract.party_name}
Email: ${contract.party_email}
Phone: ${contract.party_phone}

TERMS AND CONDITIONS:
${contract.terms}

ADDITIONAL NOTES:
${contract.notes || 'None'}

Status: ${contract.status}
Signed: ${contract.signed ? 'Yes' : 'No'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contract.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      signed: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  const contractTemplates = [
    {
      type: 'estate_sale_agreement',
      label: 'Estate Sale Agreement',
      defaultTerms: `This Estate Sale Agreement is entered into on ${new Date().toLocaleDateString()} between the Estate Sale Company and the Client.

1. SERVICES: The Company agrees to conduct an estate sale at the property.

2. COMMISSION: The Company will receive a commission of [__]% of gross sales.

3. PREPARATION: The Company will organize, price, display, and market items.

4. SALE DATES: The sale will be conducted on agreed dates.

5. PAYMENT: Settlement will occur within [__] days of sale completion.

6. LIABILITY: The Company maintains insurance but is not liable for damage beyond control.

7. TERMINATION: Either party may terminate with [__] days notice.`
    },
    {
      type: 'consignment_agreement',
      label: 'Consignment Agreement',
      defaultTerms: `This Consignment Agreement allows the Owner to consign items for sale.

1. ITEMS: Items listed and described in attached schedule.

2. PRICING: Jointly agreed upon by Owner and Company.

3. COMMISSION: Company receives [__]% of sale price.

4. DURATION: Agreement valid for [__] days.

5. PAYMENT: Owner paid within [__] days of item sale.

6. RETURN: Unsold items returned to Owner after period ends.`
    },
    {
      type: 'buyout_agreement',
      label: 'Estate Buyout Agreement',
      defaultTerms: `This Buyout Agreement is for the purchase of estate contents.

1. PURCHASE PRICE: Total agreed price of $[______].

2. ITEMS INCLUDED: All items listed in attached inventory.

3. PAYMENT TERMS: Payment made as follows: [specify terms].

4. REMOVAL: Buyer to remove all items by [date].

5. AS-IS CONDITION: All items sold in current condition.

6. INDEMNIFICATION: Buyer assumes all risk upon payment.`
    }
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(createPageUrl('MySales'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sales
          </Button>
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-900">Contracts & Agreements</h1>
            <p className="text-slate-600">{sale?.title}</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Total Contracts</div>
            <div className="text-2xl font-bold text-slate-900">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Signed</div>
            <div className="text-2xl font-bold text-green-600">
              {contracts.filter(c => c.signed).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Pending</div>
            <div className="text-2xl font-bold text-blue-600">
              {contracts.filter(c => c.status === 'sent').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 mb-1">Drafts</div>
            <div className="text-2xl font-bold text-slate-600">
              {contracts.filter(c => c.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg mb-4">No contracts yet</p>
          <p className="text-slate-600 mb-4">
            Create contracts and agreements for your estate sale clients
          </p>
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create First Contract
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map(contract => (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{contract.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status}
                        </Badge>
                        {contract.signed && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Signed
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {contract.type?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 mt-2">
                        Party: {contract.party_name} • {contract.party_email}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Created: {new Date(contract.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleView(contract)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(contract)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contract.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contract.notes && (
                  <p className="text-sm text-slate-600 mb-4">{contract.notes}</p>
                )}
                <div className="flex gap-2">
                  {contract.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(contract.id, 'sent')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Send for Signature
                    </Button>
                  )}
                  {contract.status === 'sent' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(contract.id, 'signed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark as Signed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Contract Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Contract Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Estate Sale Agreement - Smith Estate"
                required
              />
            </div>

            <div>
              <Label>Contract Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => {
                  const template = contractTemplates.find(t => t.type === value);
                  setFormData({ 
                    ...formData, 
                    type: value,
                    terms: template?.defaultTerms || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractTemplates.map(template => (
                    <SelectItem key={template.type} value={template.type}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Party Name *</Label>
                <Input
                  value={formData.party_name}
                  onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div>
                <Label>Party Email *</Label>
                <Input
                  type="email"
                  value={formData.party_email}
                  onChange={(e) => setFormData({ ...formData, party_email: e.target.value })}
                  placeholder="john@email.com"
                  required
                />
              </div>
              <div>
                <Label>Party Phone</Label>
                <Input
                  value={formData.party_phone}
                  onChange={(e) => setFormData({ ...formData, party_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label>Terms & Conditions *</Label>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Contract terms and conditions..."
                rows={12}
                required
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this contract"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Contract
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Contract Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Party Name</div>
                  <div className="text-sm text-slate-700">{selectedContract.party_name}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Email</div>
                  <div className="text-sm text-slate-700">{selectedContract.party_email}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Phone</div>
                  <div className="text-sm text-slate-700">{selectedContract.party_phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Status</div>
                  <Badge className={getStatusColor(selectedContract.status)}>
                    {selectedContract.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Terms & Conditions</h3>
                <div className="p-4 bg-white border border-slate-200 rounded-lg whitespace-pre-wrap font-mono text-sm">
                  {selectedContract.terms}
                </div>
              </div>

              {selectedContract.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Internal Notes</h3>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    {selectedContract.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => handleDownload(selectedContract)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}