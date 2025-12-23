import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText, Mail, MessageSquare, Image as ImageIcon, 
  FileSignature, Briefcase, Building2, Plus, Edit, 
  Copy, Trash2, Eye, Search, BarChart3, Tag
} from 'lucide-react';

const TEMPLATE_CATEGORIES = {
  marketing_email: { label: 'Marketing Email', icon: Mail, color: 'bg-blue-100 text-blue-700' },
  marketing_sms: { label: 'Marketing SMS', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
  marketing_social: { label: 'Social Media', icon: ImageIcon, color: 'bg-purple-100 text-purple-700' },
  sign_yard: { label: 'Yard Signs', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  sign_directional: { label: 'Directional Signs', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  sign_banner: { label: 'Banners', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  sign_window: { label: 'Window Signs', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  contract_estate_sale: { label: 'Estate Sale Contract', icon: FileSignature, color: 'bg-red-100 text-red-700' },
  contract_consignment: { label: 'Consignment Contract', icon: FileSignature, color: 'bg-red-100 text-red-700' },
  contract_vendor: { label: 'Vendor Contract', icon: FileSignature, color: 'bg-red-100 text-red-700' },
  contract_nda: { label: 'NDA', icon: FileSignature, color: 'bg-red-100 text-red-700' },
  business_letterhead: { label: 'Letterhead', icon: Building2, color: 'bg-slate-100 text-slate-700' },
  business_invoice: { label: 'Invoice', icon: Briefcase, color: 'bg-cyan-100 text-cyan-700' },
  business_receipt: { label: 'Receipt', icon: Briefcase, color: 'bg-cyan-100 text-cyan-700' },
  business_business_card: { label: 'Business Card', icon: Building2, color: 'bg-slate-100 text-slate-700' },
  business_brochure: { label: 'Brochure', icon: Building2, color: 'bg-slate-100 text-slate-700' },
  notification_email: { label: 'Notification Email', icon: Mail, color: 'bg-indigo-100 text-indigo-700' },
  notification_sms: { label: 'Notification SMS', icon: MessageSquare, color: 'bg-indigo-100 text-indigo-700' },
  form_intake: { label: 'Intake Form', icon: FileText, color: 'bg-yellow-100 text-yellow-700' },
  form_inventory: { label: 'Inventory Form', icon: FileText, color: 'bg-yellow-100 text-yellow-700' },
  report_sale_summary: { label: 'Sale Summary Report', icon: BarChart3, color: 'bg-pink-100 text-pink-700' },
  report_financial: { label: 'Financial Report', icon: BarChart3, color: 'bg-pink-100 text-pink-700' }
};

const AVAILABLE_FIELDS = {
  operator: [
    '{{operator_name}}', '{{company_name}}', '{{operator_email}}', 
    '{{operator_phone}}', '{{company_address}}', '{{company_website}}',
    '{{company_logo}}', '{{license_number}}'
  ],
  sale: [
    '{{sale_title}}', '{{sale_address}}', '{{sale_city}}', '{{sale_state}}',
    '{{sale_zip}}', '{{sale_date}}', '{{sale_time}}', '{{sale_description}}'
  ],
  user: [
    '{{user_name}}', '{{user_email}}', '{{user_phone}}', '{{user_address}}'
  ],
  agent: [
    '{{agent_name}}', '{{agent_company}}', '{{agent_email}}', '{{agent_phone}}',
    '{{agent_license}}'
  ],
  vendor: [
    '{{vendor_name}}', '{{vendor_company}}', '{{vendor_email}}', '{{vendor_phone}}',
    '{{vendor_type}}', '{{vendor_license}}'
  ],
  general: [
    '{{current_date}}', '{{current_year}}', '{{platform_name}}', 
    '{{platform_website}}', '{{platform_phone}}', '{{platform_email}}'
  ]
};

const SAMPLE_TEMPLATES = [
  {
    name: 'Estate Sale Announcement',
    category: 'marketing_email',
    type: 'email',
    subject: 'Upcoming Estate Sale: {{sale_title}}',
    content: `Dear {{user_name}},

We're excited to announce an upcoming estate sale in your area!

📍 Location: {{sale_address}}, {{sale_city}}, {{sale_state}} {{sale_zip}}
📅 Date: {{sale_date}}
⏰ Time: {{sale_time}}

{{sale_description}}

This sale features a wide variety of items including furniture, collectibles, antiques, and more. Don't miss this opportunity to find unique treasures!

Best regards,
{{company_name}}
{{operator_phone}}
{{company_website}}`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.user],
    description: 'Standard email announcement for upcoming estate sales',
    is_default: true
  },
  {
    name: 'Sale Reminder SMS',
    category: 'marketing_sms',
    type: 'sms',
    content: '⏰ Reminder: {{sale_title}} starts {{sale_date}} at {{sale_time}}. {{sale_address}}. Reply STOP to unsubscribe.',
    available_fields: [...AVAILABLE_FIELDS.sale],
    description: 'SMS reminder sent day before sale',
    is_default: true
  },
  {
    name: 'Estate Sale Contract',
    category: 'contract_estate_sale',
    type: 'document',
    content: `ESTATE SALE SERVICES AGREEMENT

This Agreement is entered into on {{current_date}} between:

SERVICE PROVIDER: {{company_name}}
Address: {{company_address}}
Phone: {{operator_phone}}
Email: {{operator_email}}

CLIENT: {{user_name}}
Address: {{user_address}}
Phone: {{user_phone}}
Email: {{user_email}}

PROPERTY ADDRESS: {{sale_address}}, {{sale_city}}, {{sale_state}} {{sale_zip}}

1. SERVICES
The Service Provider agrees to conduct an estate sale at the above property, including:
- Complete inventory and pricing of items
- Marketing and advertising
- Sale setup and staffing
- Transaction processing
- Post-sale cleanup and removal of unsold items (if applicable)

2. COMMISSION
The Service Provider shall receive a commission of ___% of gross sales proceeds.

3. SALE DATES
Scheduled sale dates: {{sale_date}}

4. RESPONSIBILITIES
Service Provider will:
- Organize, price, and display all items
- Provide adequate staffing during sale hours
- Secure the property during the sale
- Provide detailed sales report within 7 days of sale completion

Client agrees to:
- Provide full access to the property
- Remove all items designated as "not for sale"
- Ensure utilities remain connected during sale period

5. PAYMENT
Final settlement and payment to Client will be made within 10 business days of sale completion.

6. INSURANCE
Service Provider maintains liability insurance coverage during the sale period.

SERVICE PROVIDER:                          CLIENT:

________________________              ________________________
{{operator_name}}                           {{user_name}}
Date: {{current_date}}                     Date: ____________`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.user, ...AVAILABLE_FIELDS.general],
    description: 'Standard estate sale services contract',
    is_default: true
  },
  {
    name: 'Yard Sign - Standard',
    category: 'sign_yard',
    type: 'image',
    content: `ESTATE SALE
{{sale_date}}
{{sale_time}}
{{sale_address}}

Items Include:
Furniture • Antiques • Collectibles

{{company_name}}
{{operator_phone}}`,
    dimensions: { width: '18', height: '24', unit: 'inches' },
    available_fields: [...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.operator],
    style_settings: {
      font_family: 'Arial Black',
      font_size: '48px',
      colors: {
        primary: '#f97316',
        secondary: '#0891b2',
        text: '#1e293b',
        background: '#ffffff'
      }
    },
    description: 'Standard 18x24" yard sign template',
    is_default: true
  },
  {
    name: 'Directional Arrow Sign',
    category: 'sign_directional',
    type: 'image',
    content: `→ ESTATE SALE →
{{sale_date}}
{{company_name}}`,
    dimensions: { width: '12', height: '18', unit: 'inches' },
    available_fields: [...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.operator],
    style_settings: {
      font_family: 'Arial Black',
      font_size: '36px',
      colors: {
        primary: '#f97316',
        text: '#ffffff',
        background: '#1e293b'
      }
    },
    description: 'Directional arrow sign for guiding traffic',
    is_default: true
  },
  {
    name: 'Invoice Template',
    category: 'business_invoice',
    type: 'document',
    content: `{{company_name}}
{{company_address}}
Phone: {{operator_phone}} | Email: {{operator_email}}
{{company_website}}

INVOICE

Invoice #: INV-{{current_date}}
Date: {{current_date}}

Bill To:
{{user_name}}
{{user_address}}
{{user_email}}

Description                    Amount
─────────────────────────────────────
[Item details to be added]


                    Subtotal: $______
                         Tax: $______
                       Total: $______

Payment is due within 30 days.

Thank you for your business!`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.user, ...AVAILABLE_FIELDS.general],
    description: 'Professional invoice template',
    is_default: true
  },
  {
    name: 'Thank You Email',
    category: 'notification_email',
    type: 'email',
    subject: 'Thank You for Attending Our Estate Sale!',
    content: `Dear {{user_name}},

Thank you for attending our estate sale at {{sale_address}}!

We hope you found some wonderful items. Your support means the world to us and helps make these sales successful.

If you're interested in being notified about future sales in your area, make sure to keep your notifications enabled in your account settings.

We look forward to seeing you at our next sale!

Best regards,
{{company_name}}
{{operator_phone}}
{{company_website}}

Follow us on social media for updates!`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.user],
    description: 'Post-sale thank you email to attendees',
    is_default: false
  },
  {
    name: 'Consignment Agreement',
    category: 'contract_consignment',
    type: 'document',
    content: `CONSIGNMENT AGREEMENT

Date: {{current_date}}

CONSIGNOR: {{user_name}}
Address: {{user_address}}
Phone: {{user_phone}}

CONSIGNEE: {{company_name}}
Address: {{company_address}}
Phone: {{operator_phone}}

TERMS:
1. The Consignor agrees to consign items to the Consignee for sale.
2. Commission rate: ___% of sale price.
3. Consignment period: ___ days from {{current_date}}.
4. Unsold items may be returned to Consignor or donated (check one):
   [ ] Return   [ ] Donate
5. Payment to Consignor will be made within 10 days of item sale.

ITEM LIST:
[To be detailed separately]

Consignor Signature: ________________  Date: ________
{{user_name}}

Consignee Signature: ________________  Date: ________
{{operator_name}}, {{company_name}}`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.user, ...AVAILABLE_FIELDS.general],
    description: 'Standard consignment agreement',
    is_default: true
  },
  {
    name: 'Vendor Service Agreement',
    category: 'contract_vendor',
    type: 'document',
    content: `VENDOR SERVICE AGREEMENT

Agreement Date: {{current_date}}

CLIENT: {{company_name}}
Contact: {{operator_name}}
Phone: {{operator_phone}}
Email: {{operator_email}}

VENDOR: {{vendor_company}}
Contact: {{vendor_name}}
Phone: {{vendor_phone}}
Email: {{vendor_email}}
Service Type: {{vendor_type}}
License #: {{vendor_license}}

PROJECT: {{sale_title}}
Location: {{sale_address}}
Scheduled Date: {{sale_date}}

SCOPE OF WORK:
[To be specified]

COMPENSATION:
Amount: $________
Payment Terms: ________

Both parties agree to the terms outlined above.

Client Signature: ________________  Date: ________
Vendor Signature: ________________  Date: ________`,
    available_fields: [...AVAILABLE_FIELDS.operator, ...AVAILABLE_FIELDS.vendor, ...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.general],
    description: 'Agreement for vendor services',
    is_default: true
  },
  {
    name: 'Social Media Post',
    category: 'marketing_social',
    type: 'social_post',
    content: `🏡 ESTATE SALE ALERT! 🏡

📍 {{sale_address}}
📅 {{sale_date}}
⏰ {{sale_time}}

{{sale_description}}

Don't miss out on amazing finds! See you there! 

#EstateSale #{{sale_city}} #Treasures #Antiques #Furniture

{{company_name}} | {{company_website}}`,
    available_fields: [...AVAILABLE_FIELDS.sale, ...AVAILABLE_FIELDS.operator],
    description: 'Social media announcement template',
    is_default: true
  }
];

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'marketing_email',
    type: 'email',
    subject: '',
    content: '',
    description: '',
    available_fields: [],
    dimensions: {},
    style_settings: {},
    is_active: true,
    is_default: false
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await base44.entities.Template.list('-created_date');
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSampleTemplates = async () => {
    try {
      for (const template of SAMPLE_TEMPLATES) {
        await base44.entities.Template.create(template);
      }
      await loadTemplates();
      alert('Sample templates created successfully!');
    } catch (error) {
      console.error('Error creating sample templates:', error);
      alert('Failed to create sample templates');
    }
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await base44.entities.Template.update(editingTemplate.id, formData);
      } else {
        await base44.entities.Template.create(formData);
      }
      await loadTemplates();
      setModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await base44.entities.Template.delete(id);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const duplicate = { ...template, name: `${template.name} (Copy)`, is_default: false };
      delete duplicate.id;
      delete duplicate.created_date;
      delete duplicate.updated_date;
      await base44.entities.Template.create(duplicate);
      await loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'marketing_email',
      type: 'email',
      subject: '',
      content: '',
      description: '',
      available_fields: [],
      dimensions: {},
      style_settings: {},
      is_active: true,
      is_default: false
    });
    setEditingTemplate(null);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData(template);
    setModalOpen(true);
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) acc[template.category] = [];
    acc[template.category].push(template);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Templates</h1>
          <p className="text-slate-600">Manage marketing, contract, and business templates</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button onClick={initializeSampleTemplates} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Load Sample Templates
            </Button>
          )}
          <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Templates</div>
            <div className="text-2xl font-bold text-slate-900">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Marketing</div>
            <div className="text-2xl font-bold text-blue-600">
              {templates.filter(t => t.category.startsWith('marketing_')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Contracts</div>
            <div className="text-2xl font-bold text-red-600">
              {templates.filter(t => t.category.startsWith('contract_')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {templates.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="marketing_email">Marketing Email</SelectItem>
            <SelectItem value="marketing_sms">Marketing SMS</SelectItem>
            <SelectItem value="marketing_social">Social Media</SelectItem>
            <SelectItem value="sign_yard">Yard Signs</SelectItem>
            <SelectItem value="sign_directional">Directional Signs</SelectItem>
            <SelectItem value="contract_estate_sale">Estate Sale Contract</SelectItem>
            <SelectItem value="contract_consignment">Consignment Contract</SelectItem>
            <SelectItem value="business_invoice">Invoice</SelectItem>
            <SelectItem value="notification_email">Notification Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="space-y-8">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              {TEMPLATE_CATEGORIES[category] && (
                <>
                  <div className={`p-2 rounded-lg ${TEMPLATE_CATEGORIES[category].color}`}>
                    {React.createElement(TEMPLATE_CATEGORIES[category].icon, { className: 'w-5 h-5' })}
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900">
                    {TEMPLATE_CATEGORIES[category].label}
                  </h2>
                  <Badge variant="outline">{categoryTemplates.length}</Badge>
                </>
              )}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTemplates.map(template => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.description && (
                          <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                        )}
                      </div>
                      {template.is_default && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.available_fields?.slice(0, 3).map((field, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                      {template.available_fields?.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.available_fields.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPreviewTemplate(template); setPreviewOpen(true); }}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(template)}
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'email' && (
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter subject line"
                />
              </div>
            )}

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this template's purpose"
                rows={2}
              />
            </div>

            <div>
              <Label>Template Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter template content with placeholders like {{field_name}}"
                rows={12}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label>Available Dynamic Fields</Label>
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(AVAILABLE_FIELDS).map(([group, fields]) => (
                  <div key={group}>
                    <div className="font-semibold text-sm text-slate-700 capitalize mb-2">{group} Fields:</div>
                    <div className="flex flex-wrap gap-2">
                      {fields.map(field => (
                        <Badge
                          key={field}
                          variant="secondary"
                          className="cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            navigator.clipboard.writeText(field);
                            alert(`Copied ${field} to clipboard!`);
                          }}
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Click any field to copy it to clipboard</p>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Set as Default</span>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.subject && (
                <div>
                  <Label>Subject:</Label>
                  <div className="p-3 bg-slate-50 rounded-lg font-semibold">{previewTemplate.subject}</div>
                </div>
              )}
              <div>
                <Label>Content:</Label>
                <div className="p-4 bg-slate-50 rounded-lg whitespace-pre-wrap font-mono text-sm border">
                  {previewTemplate.content}
                </div>
              </div>
              {previewTemplate.available_fields && previewTemplate.available_fields.length > 0 && (
                <div>
                  <Label>Dynamic Fields Used:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.available_fields.map((field, idx) => (
                      <Badge key={idx} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}