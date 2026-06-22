import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Mail, Phone, Calendar, Check, Loader2, Search } from 'lucide-react';

const VENDOR_TYPES = [
  { value: 'donation_company', label: 'Donation Company', category: 'community_donation', free: true },
  { value: 'junk_removal', label: 'Junk Removal', category: 'cleanout_prep' },
  { value: 'cleanout_crew', label: 'Cleanout Crew', category: 'cleanout_prep' },
  { value: 'deep_cleaning', label: 'Deep Cleaning', category: 'cleaning_staging' },
  { value: 'handyman', label: 'Handyman', category: 'light_repair_prep' },
  { value: 'general_contractor', label: 'General Contractor', category: 'specialty_contractors' },
  { value: 'electrician', label: 'Electrician', category: 'specialty_contractors' },
  { value: 'plumber', label: 'Plumber', category: 'specialty_contractors' },
  { value: 'moving_company', label: 'Moving Company', category: 'moving_logistics' },
  { value: 'real_estate_agent', label: 'Real Estate Agent', category: 'real_estate_legal' },
  { value: 'probate_attorney', label: 'Probate Attorney', category: 'real_estate_legal' },
  { value: 'senior_move_manager', label: 'Senior Move Manager', category: 'senior_transition' },
  { value: 'antique_dealer', label: 'Antique Dealer', category: 'buyer_facing' },
  { value: 'auction_house', label: 'Auction House', category: 'buyer_facing' },
  { value: 'appraiser', label: 'Appraiser', category: 'buyer_facing' },
  { value: 'other', label: 'Other', category: 'other' }
];

export default function VendorManagement() {
  const [user, setUser] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    vendor_type: 'donation_company',
    contact_email: '',
    contact_phone: '',
    website: '',
    service_areas: ''
  });

  useEffect(() => {
    loadUserAndVendors();
  }, []);

  const loadUserAndVendors = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      if (userData.role !== 'admin' && userData.primary_account_type !== 'estate_sale_operator') {
        alert('Access denied.');
        return;
      }
      const vendorData = await base44.entities.Vendor.list('-invited_date');
      setVendors(vendorData);
    } catch (error) {
      console.error('Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    if (!formData.company_name || !formData.contact_email || !formData.vendor_type) {
      alert('Please fill in required fields');
      return;
    }
    setCreating(true);
    try {
      const result = await base44.functions.invoke('createVendorWithInvite', {
        company_name: formData.company_name,
        vendor_type: formData.vendor_type,
        vendor_category: VENDOR_TYPES.find(t => t.value === formData.vendor_type)?.category || 'other',
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        service_areas: formData.service_areas.split(',').map(s => s.trim()).filter(Boolean)
      });
      if (result.success) {
        alert(`Invite sent to ${formData.contact_email}`);
        setShowForm(false);
        setFormData({ company_name: '', vendor_type: 'donation_company', contact_email: '', contact_phone: '', website: '', service_areas: '' });
        loadUserAndVendors();
      } else {
        alert(result.error || 'Failed');
      }
    } catch (error) {
      alert(error.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (vendor) => {
    if (vendor.subscription_status === 'active') return <Badge className="bg-green-600">Active</Badge>;
    if (vendor.subscription_status === 'free_trial') {
      const daysLeft = vendor.trial_end_date ? Math.max(0, Math.ceil((new Date(vendor.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
      return <Badge className="bg-amber-500">Trial {daysLeft > 0 ? `(${daysLeft}d)` : '(Exp)'}</Badge>;
    }
    if (vendor.subscription_status === 'expired') return <Badge className="bg-red-600">Expired</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  const filteredVendors = vendors.filter(v => v.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || v.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/4"></div><div className="h-64 bg-slate-200 rounded"></div></div></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-serif font-bold text-slate-900">Vendor Management</h1><p className="text-slate-600">Create and manage vendor invites</p></div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-2" />Invite Vendor</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Invite New Vendor</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="company_name">Company Name *</Label><Input id="company_name" value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="ABC Services" /></div>
              <div><Label htmlFor="vendor_type">Vendor Type *</Label><select id="vendor_type" value={formData.vendor_type} onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{VENDOR_TYPES.map(type => (<option key={type.value} value={type.value}>{type.label} {type.free ? '(Free Forever)' : ''}</option>))}</select></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="contact_email">Contact Email *</Label><Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} placeholder="contact@company.com" /></div>
              <div><Label htmlFor="contact_phone">Contact Phone</Label><Input id="contact_phone" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} placeholder="(555) 123-4567" /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="website">Website</Label><Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://company.com" /></div>
              <div><Label htmlFor="service_areas">Service Areas</Label><Input id="service_areas" value={formData.service_areas} onChange={(e) => setFormData({ ...formData, service_areas: e.target.value })} placeholder="City1, City2" /></div>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4"><p className="text-sm text-cyan-800"><strong>Note:</strong> Vendor receives email with claim link. 14-day free trial (donation companies free).</p></div>
            <div className="flex gap-2">
              <Button onClick={handleCreateVendor} disabled={creating} className="flex-1 bg-cyan-600 hover:bg-cyan-700">{creating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>) : (<><Mail className="w-4 h-4 mr-2" />Send Invite</>)}</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Vendors ({filteredVendors.length})</CardTitle><div className="relative mt-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" /><Input placeholder="Search vendors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredVendors.map(vendor => (
              <div key={vendor.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-semibold text-slate-900">{vendor.company_name}</h3><p className="text-sm text-slate-500">{vendor.vendor_type.replace(/_/g, ' ')}</p></div>
                  {getStatusBadge(vendor)}
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm mb-3">
                  <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" />{vendor.contact_email || vendor.invite_email}</div>
                  {vendor.contact_phone && (<div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" />{vendor.contact_phone}</div>)}
                  {vendor.trial_end_date && (<div className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-slate-400" />Trial: {new Date(vendor.trial_end_date).toLocaleDateString()}</div>)}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Invited: {vendor.invited_date ? new Date(vendor.invited_date).toLocaleDateString() : 'N/A'}</span>
                  <span>•</span>
                  <span>Status: {vendor.claim_status}</span>
                  {vendor.is_public && (<><span>•</span><Badge variant="outline" className="text-green-600 border-green-600"><Check className="w-3 h-3 mr-1" />Public</Badge></>)}
                </div>
              </div>
            ))}
            {filteredVendors.length === 0 && (<div className="text-center py-12 text-slate-500"><Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p>No vendors found</p></div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}