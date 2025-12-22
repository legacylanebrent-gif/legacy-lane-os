import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import VendorFields from './VendorFields';
import VendorSubcategoryDropdown from './VendorSubcategoryDropdown';

const ACCOUNT_TYPES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'platform_ops', label: 'Platform Ops' },
  { value: 'growth_team', label: 'Growth Team' },
  { value: 'partnerships', label: 'Partnerships' },
  { value: 'education_admin', label: 'Education Admin' },
  { value: 'finance_admin', label: 'Finance Admin' },
  { value: 'estate_sale_operator', label: 'Estate Sale Operator' },
  { value: 'real_estate_agent', label: 'Real Estate Agent' },
  { value: 'investor', label: 'Investor' },
  { value: 'consignor', label: 'Consignor' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'coach', label: 'Coach' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'executor', label: 'Executor' },
  { value: 'home_seller', label: 'Home Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'downsizer', label: 'Downsizer' },
  { value: 'diy_seller', label: 'DIY Seller' }
];

export default function AddUserModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    primary_account_type: '',
    phone: '',
    bio: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    },
    company_name: '',
    company_logo_url: '',
    light_logo_url: '',
    dark_logo_url: '',
    team_logo_url: '',
    brokerage_name: '',
    dre_license: '',
    mls_id: '',
    team_name: '',
    investment_entity_name: '',
    investment_strategies: [],
    years_investing: '',
    portfolio_size: '',
    average_deal_size: '',
    target_property_types: [],
    funding_capacity: '',
    seeking_partnerships: false,
    vendor_type: '',
    vendor_certifications: [],
    vendor_licenses: [],
    bonded: false,
    insured: false,
    crew_size: '',
    equipment_owned: [],
    response_time_hours: '',
    emergency_services: false,
    warranty_offered: '',
    minimum_project_size: '',
    average_project_cost: '',
    payment_terms: '',
    disposal_method: '',
    truck_capacity: '',
    storage_available: false,
    packing_services: false,
    bar_number: '',
    practice_areas: [],
    cpa_license: '',
    tax_specialties: [],
    staging_inventory: '',
    design_styles: [],
    contractor_specialties: [],
    photography_packages: [],
    drone_certified: false,
    inspection_types: [],
    report_turnaround: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    business_license: '',
    insurance_provider: '',
    insurance_policy_number: '',
    years_in_business: '',
    default_commission_rate: '',
    service_areas: [],
    specializations: [],
    company_address: {
      street: '',
      city: '',
      state: '',
      zip: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLightLogo, setUploadingLightLogo] = useState(false);
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);
  const [uploadingTeamLogo, setUploadingTeamLogo] = useState(false);

  const processImage = (file, maxSize = 500, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize to max dimension
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' }));
              } else {
                reject(new Error('Failed to process image'));
              }
            },
            'image/webp',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const processedFile = await processImage(file, 500, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
      setFormData({ ...formData, company_logo_url: file_url });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLightLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLightLogo(true);
    try {
      const processedFile = await processImage(file, 500, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
      setFormData({ ...formData, light_logo_url: file_url });
    } catch (error) {
      console.error('Error uploading light logo:', error);
      alert('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingLightLogo(false);
    }
  };

  const handleDarkLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDarkLogo(true);
    try {
      const processedFile = await processImage(file, 500, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
      setFormData({ ...formData, dark_logo_url: file_url });
    } catch (error) {
      console.error('Error uploading dark logo:', error);
      alert('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingDarkLogo(false);
    }
  };

  const handleTeamLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTeamLogo(true);
    try {
      const processedFile = await processImage(file, 500, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });
      setFormData({ ...formData, team_logo_url: file_url });
    } catch (error) {
      console.error('Error uploading team logo:', error);
      alert('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingTeamLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const divisions = [];
      const accountType = formData.primary_account_type;

      if (['estate_sale_operator', 'executor', 'consignor'].includes(accountType)) {
        divisions.push('estate_services');
      }
      if (['real_estate_agent', 'home_seller', 'buyer'].includes(accountType)) {
        divisions.push('real_estate');
      }
      if (accountType === 'investor') {
        divisions.push('investment');
      }
      if (['consumer', 'buyer', 'diy_seller', 'downsizer', 'consignor'].includes(accountType)) {
        divisions.push('marketplace');
      }
      if (['estate_sale_operator', 'real_estate_agent', 'investor'].includes(accountType)) {
        divisions.push('marketing');
      }
      if (accountType === 'coach' || divisions.length > 0) {
        divisions.push('education');
      }

      await base44.asServiceRole.entities.User.create({
        ...formData,
        account_types: [formData.primary_account_type],
        divisions_access: [...new Set(divisions)],
        onboarding_completed: true
      });

      onSuccess();
      onClose();
      setFormData({
        full_name: '',
        email: '',
        primary_account_type: '',
        phone: '',
        bio: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        },
        company_name: '',
        company_logo_url: '',
        light_logo_url: '',
        dark_logo_url: '',
        team_logo_url: '',
        brokerage_name: '',
        dre_license: '',
        mls_id: '',
        team_name: '',
        investment_entity_name: '',
        investment_strategies: [],
        years_investing: '',
        portfolio_size: '',
        average_deal_size: '',
        target_property_types: [],
        funding_capacity: '',
        seeking_partnerships: false,
        vendor_type: '',
        vendor_certifications: [],
        vendor_licenses: [],
        bonded: false,
        insured: false,
        crew_size: '',
        equipment_owned: [],
        response_time_hours: '',
        emergency_services: false,
        warranty_offered: '',
        minimum_project_size: '',
        average_project_cost: '',
        payment_terms: '',
        disposal_method: '',
        truck_capacity: '',
        storage_available: false,
        packing_services: false,
        bar_number: '',
        practice_areas: [],
        cpa_license: '',
        tax_specialties: [],
        staging_inventory: '',
        design_styles: [],
        contractor_specialties: [],
        photography_packages: [],
        drone_certified: false,
        inspection_types: [],
        report_turnaround: '',
        company_phone: '',
        company_email: '',
        company_website: '',
        business_license: '',
        insurance_provider: '',
        insurance_policy_number: '',
        years_in_business: '',
        default_commission_rate: '',
        service_areas: [],
        specializations: [],
        company_address: {
          street: '',
          city: '',
          state: '',
          zip: ''
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="account_type">Account Type *</Label>
            <Select 
              value={formData.primary_account_type}
              onValueChange={(value) => setFormData({...formData, primary_account_type: value})}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.primary_account_type === 'vendor' && (
            <VendorSubcategoryDropdown formData={formData} setFormData={setFormData} />
          )}

          {formData.primary_account_type && (
            <>
              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Personal Address</Label>
              <Input
                placeholder="Street Address"
                value={formData.address.street}
                onChange={(e) => setFormData({...formData, address: {...formData.address, street: e.target.value}})}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, city: e.target.value}})}
                />
                <Input
                  placeholder="State"
                  value={formData.address.state}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, state: e.target.value}})}
                />
                <Input
                  placeholder="ZIP"
                  value={formData.address.zip}
                  onChange={(e) => setFormData({...formData, address: {...formData.address, zip: e.target.value}})}
                />
              </div>
            </div>
          </div>

          {formData.primary_account_type === 'vendor' && (
            <>
              <Separator />
              <VendorFields 
                formData={formData}
                setFormData={setFormData}
                uploadingLogo={uploadingLogo}
                handleLogoUpload={handleLogoUpload}
              />
            </>
          )}

          {['estate_sale_operator', 'real_estate_agent', 'coach'].includes(formData.primary_account_type) && (
            <>
              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {formData.primary_account_type === 'estate_sale_operator' && 'Estate Sale Company Details'}
                  {formData.primary_account_type === 'real_estate_agent' && 'Real Estate Business Details'}
                  {formData.primary_account_type === 'coach' && 'Coaching Business Details'}
                </h3>
            
            {formData.primary_account_type === 'real_estate_agent' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brokerage_name">Brokerage Name</Label>
                    <Input
                      id="brokerage_name"
                      value={formData.brokerage_name}
                      onChange={(e) => setFormData({...formData, brokerage_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="team_name">Team Name (Optional)</Label>
                    <Input
                      id="team_name"
                      value={formData.team_name}
                      onChange={(e) => setFormData({...formData, team_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dre_license">DRE License #</Label>
                    <Input
                      id="dre_license"
                      value={formData.dre_license}
                      onChange={(e) => setFormData({...formData, dre_license: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mls_id">MLS ID</Label>
                    <Input
                      id="mls_id"
                      value={formData.mls_id}
                      onChange={(e) => setFormData({...formData, mls_id: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_phone">Phone</Label>
                    <Input
                      id="company_phone"
                      type="tel"
                      value={formData.company_phone}
                      onChange={(e) => setFormData({...formData, company_phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_email">Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => setFormData({...formData, company_email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.company_website}
                    onChange={(e) => setFormData({...formData, company_website: e.target.value})}
                  />
                </div>

                <div className="space-y-4 border-t pt-4 mt-4">
                  <h4 className="font-semibold text-sm">Brand Logos</h4>
                  
                  <div>
                    <Label htmlFor="light_logo">Light Logo (for dark backgrounds)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="light_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLightLogoUpload}
                        disabled={uploadingLightLogo}
                        className="flex-1"
                      />
                      {uploadingLightLogo && <span className="text-sm text-gray-500">Uploading...</span>}
                      {formData.light_logo_url && !uploadingLightLogo && (
                        <img src={formData.light_logo_url} alt="Light logo preview" className="h-12 w-12 object-contain rounded border bg-slate-800 p-1" />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="dark_logo">Dark Logo (for light backgrounds)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="dark_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleDarkLogoUpload}
                        disabled={uploadingDarkLogo}
                        className="flex-1"
                      />
                      {uploadingDarkLogo && <span className="text-sm text-gray-500">Uploading...</span>}
                      {formData.dark_logo_url && !uploadingDarkLogo && (
                        <img src={formData.dark_logo_url} alt="Dark logo preview" className="h-12 w-12 object-contain rounded border" />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="team_logo">Team Logo</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="team_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleTeamLogoUpload}
                        disabled={uploadingTeamLogo}
                        className="flex-1"
                      />
                      {uploadingTeamLogo && <span className="text-sm text-gray-500">Uploading...</span>}
                      {formData.team_logo_url && !uploadingTeamLogo && (
                        <img src={formData.team_logo_url} alt="Team logo preview" className="h-12 w-12 object-contain rounded border" />
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="years_in_business">Years in Business</Label>
                    <Input
                      id="years_in_business"
                      type="number"
                      value={formData.years_in_business}
                      onChange={(e) => setFormData({...formData, years_in_business: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_phone">Company Phone</Label>
                    <Input
                      id="company_phone"
                      type="tel"
                      value={formData.company_phone}
                      onChange={(e) => setFormData({...formData, company_phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_email">Company Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => setFormData({...formData, company_email: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_website">Company Website</Label>
                  <Input
                    id="company_website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.company_website}
                    onChange={(e) => setFormData({...formData, company_website: e.target.value})}
                  />
                </div>
              </>
            )}

            {['estate_sale_operator', 'coach'].includes(formData.primary_account_type) && (
              <div>
                <Label htmlFor="company_logo">Company Logo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="company_logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="flex-1"
                  />
                  {uploadingLogo && <span className="text-sm text-gray-500">Uploading...</span>}
                  {formData.company_logo_url && !uploadingLogo && (
                    <img src={formData.company_logo_url} alt="Logo preview" className="h-12 w-12 object-contain rounded border" />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Company Address</Label>
              <Input
                placeholder="Street Address"
                value={formData.company_address.street}
                onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, street: e.target.value}})}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="City"
                  value={formData.company_address.city}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, city: e.target.value}})}
                />
                <Input
                  placeholder="State"
                  value={formData.company_address.state}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, state: e.target.value}})}
                />
                <Input
                  placeholder="ZIP"
                  value={formData.company_address.zip}
                  onChange={(e) => setFormData({...formData, company_address: {...formData.company_address, zip: e.target.value}})}
                />
              </div>
            </div>

            {formData.primary_account_type === 'estate_sale_operator' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_license">Business License Number</Label>
                  <Input
                    id="business_license"
                    value={formData.business_license}
                    onChange={(e) => setFormData({...formData, business_license: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="commission_rate">Default Commission %</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    placeholder="25"
                    value={formData.default_commission_rate}
                    onChange={(e) => setFormData({...formData, default_commission_rate: e.target.value})}
                  />
                </div>
              </div>
            )}

            {['estate_sale_operator', 'vendor'].includes(formData.primary_account_type) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurance_provider">Insurance Provider</Label>
                  <Input
                    id="insurance_provider"
                    value={formData.insurance_provider}
                    onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="insurance_policy">Policy Number</Label>
                  <Input
                    id="insurance_policy"
                    value={formData.insurance_policy_number}
                    onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                  />
                </div>
              </div>
            )}

            {formData.primary_account_type === 'real_estate_agent' && (
              <div>
                <Label htmlFor="service_areas">Service Areas (comma separated)</Label>
                <Input
                  id="service_areas"
                  placeholder="Los Angeles, Orange County, San Diego"
                  onChange={(e) => setFormData({
                    ...formData, 
                    service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}

            {['estate_sale_operator'].includes(formData.primary_account_type) && (
              <div>
                <Label htmlFor="service_areas">Service Areas (comma separated)</Label>
                <Input
                  id="service_areas"
                  placeholder="Los Angeles, Orange County, San Diego"
                  onChange={(e) => setFormData({
                    ...formData, 
                    service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}

            {formData.primary_account_type === 'real_estate_agent' && (
              <div>
                <Label htmlFor="specializations">Property Specializations (comma separated)</Label>
                <Input
                  id="specializations"
                  placeholder="Residential, Luxury Homes, Investment Properties, Probate Sales"
                  onChange={(e) => setFormData({
                    ...formData, 
                    specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}

            {['estate_sale_operator', 'coach'].includes(formData.primary_account_type) && (
              <div>
                <Label htmlFor="specializations">
                  {formData.primary_account_type === 'estate_sale_operator' && 'Specializations (comma separated)'}
                  {formData.primary_account_type === 'coach' && 'Expertise Areas (comma separated)'}
                </Label>
                <Input
                  id="specializations"
                  placeholder={
                    formData.primary_account_type === 'estate_sale_operator' ? 'Estate Sales, Downsizing, Consignment' :
                    'Real Estate, Marketing, Sales'
                  }
                  onChange={(e) => setFormData({
                    ...formData, 
                    specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}
              </div>
            </>
          )}

          {formData.primary_account_type === 'investor' && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Investment Profile</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="investment_entity_name">Investment Entity/LLC Name</Label>
                    <Input
                      id="investment_entity_name"
                      placeholder="ABC Investments LLC"
                      value={formData.investment_entity_name}
                      onChange={(e) => setFormData({...formData, investment_entity_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="years_investing">Years Investing</Label>
                    <Input
                      id="years_investing"
                      type="number"
                      placeholder="5"
                      value={formData.years_investing}
                      onChange={(e) => setFormData({...formData, years_investing: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="investment_strategies">Investment Strategies (comma separated)</Label>
                  <Input
                    id="investment_strategies"
                    placeholder="Fix & Flip, Buy & Hold, Wholesale, BRRRR"
                    onChange={(e) => setFormData({
                      ...formData, 
                      investment_strategies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="target_property_types">Target Property Types (comma separated)</Label>
                  <Input
                    id="target_property_types"
                    placeholder="Single Family, Multi-Family, Condos, Commercial"
                    onChange={(e) => setFormData({
                      ...formData, 
                      target_property_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="portfolio_size">Current Portfolio Size</Label>
                    <Input
                      id="portfolio_size"
                      placeholder="12 properties"
                      value={formData.portfolio_size}
                      onChange={(e) => setFormData({...formData, portfolio_size: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="average_deal_size">Average Deal Size</Label>
                    <Input
                      id="average_deal_size"
                      placeholder="$250,000"
                      value={formData.average_deal_size}
                      onChange={(e) => setFormData({...formData, average_deal_size: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="funding_capacity">Funding Capacity</Label>
                  <Input
                    id="funding_capacity"
                    placeholder="$500,000 - $1,000,000"
                    value={formData.funding_capacity}
                    onChange={(e) => setFormData({...formData, funding_capacity: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="service_areas">Target Markets (comma separated)</Label>
                  <Input
                    id="service_areas"
                    placeholder="Los Angeles, Orange County, Riverside"
                    onChange={(e) => setFormData({
                      ...formData, 
                      service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="seeking_partnerships"
                    checked={formData.seeking_partnerships}
                    onChange={(e) => setFormData({...formData, seeking_partnerships: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="seeking_partnerships" className="cursor-pointer">
                    Open to Joint Ventures / Partnerships
                  </Label>
                </div>
              </div>
            </>
          )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}