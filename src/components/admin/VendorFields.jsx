import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const VENDOR_TYPES = [
  { value: 'mover', label: 'Moving Company' },
  { value: 'cleanout', label: 'Cleanout Service' },
  { value: 'attorney', label: 'Attorney / Legal Services' },
  { value: 'cpa', label: 'CPA / Accountant' },
  { value: 'stager', label: 'Home Stager' },
  { value: 'general_contractor', label: 'General Contractor' },
  { value: 'appraiser', label: 'Appraiser' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'inspector', label: 'Home Inspector' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'handyman', label: 'Handyman Services' },
  { value: 'estate_liquidator', label: 'Estate Liquidator' },
  { value: 'storage', label: 'Storage Services' },
  { value: 'junk_removal', label: 'Junk Removal' },
  { value: 'hvac', label: 'HVAC Services' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'painter', label: 'Painter' },
  { value: 'flooring', label: 'Flooring Specialist' },
  { value: 'roofer', label: 'Roofing Contractor' }
];

export default function VendorFields({ formData, setFormData, uploadingLogo, handleLogoUpload }) {
  const renderVendorTypeFields = () => {
    if (!formData.vendor_type) return null;

    const commonFields = (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="bonded"
              checked={formData.bonded}
              onCheckedChange={(checked) => setFormData({...formData, bonded: checked})}
            />
            <Label htmlFor="bonded" className="cursor-pointer">Bonded</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="insured"
              checked={formData.insured}
              onCheckedChange={(checked) => setFormData({...formData, insured: checked})}
            />
            <Label htmlFor="insured" className="cursor-pointer">Insured</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="vendor_licenses">License Numbers (comma separated)</Label>
          <Input
            id="vendor_licenses"
            placeholder="CA-123456, CL-789012"
            onChange={(e) => setFormData({
              ...formData,
              vendor_licenses: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="response_time">Response Time (hours)</Label>
            <Input
              id="response_time"
              type="number"
              placeholder="24"
              value={formData.response_time_hours}
              onChange={(e) => setFormData({...formData, response_time_hours: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="average_cost">Average Project Cost</Label>
            <Input
              id="average_cost"
              placeholder="$500 - $2,000"
              value={formData.average_project_cost}
              onChange={(e) => setFormData({...formData, average_project_cost: e.target.value})}
            />
          </div>
        </div>

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
      </>
    );

    switch (formData.vendor_type) {
      case 'mover':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="truck_capacity">Truck Capacity</Label>
                <Input
                  id="truck_capacity"
                  placeholder="26 ft, 3 trucks"
                  value={formData.truck_capacity}
                  onChange={(e) => setFormData({...formData, truck_capacity: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="crew_size">Crew Size</Label>
                <Input
                  id="crew_size"
                  placeholder="4-6 movers"
                  value={formData.crew_size}
                  onChange={(e) => setFormData({...formData, crew_size: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="storage_available"
                  checked={formData.storage_available}
                  onCheckedChange={(checked) => setFormData({...formData, storage_available: checked})}
                />
                <Label htmlFor="storage_available" className="cursor-pointer">Storage Available</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="packing_services"
                  checked={formData.packing_services}
                  onCheckedChange={(checked) => setFormData({...formData, packing_services: checked})}
                />
                <Label htmlFor="packing_services" className="cursor-pointer">Packing Services</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="equipment">Equipment Owned (comma separated)</Label>
              <Input
                id="equipment"
                placeholder="Dollies, Straps, Blankets, Boxes"
                onChange={(e) => setFormData({
                  ...formData,
                  equipment_owned: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'cleanout':
      case 'junk_removal':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="truck_capacity">Truck Capacity</Label>
                <Input
                  id="truck_capacity"
                  placeholder="20 cubic yards"
                  value={formData.truck_capacity}
                  onChange={(e) => setFormData({...formData, truck_capacity: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="crew_size">Crew Size</Label>
                <Input
                  id="crew_size"
                  placeholder="2-4 workers"
                  value={formData.crew_size}
                  onChange={(e) => setFormData({...formData, crew_size: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="disposal_method">Disposal Method</Label>
              <Input
                id="disposal_method"
                placeholder="Donation, Recycling, Landfill"
                value={formData.disposal_method}
                onChange={(e) => setFormData({...formData, disposal_method: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="minimum_project">Minimum Project Size</Label>
              <Input
                id="minimum_project"
                placeholder="$200 minimum"
                value={formData.minimum_project_size}
                onChange={(e) => setFormData({...formData, minimum_project_size: e.target.value})}
              />
            </div>
          </>
        );

      case 'attorney':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bar_number">State Bar Number</Label>
                <Input
                  id="bar_number"
                  placeholder="CA Bar #123456"
                  value={formData.bar_number}
                  onChange={(e) => setFormData({...formData, bar_number: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="years_practice">Years in Practice</Label>
                <Input
                  id="years_practice"
                  type="number"
                  value={formData.years_in_business}
                  onChange={(e) => setFormData({...formData, years_in_business: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="practice_areas">Practice Areas (comma separated)</Label>
              <Input
                id="practice_areas"
                placeholder="Probate, Estate Planning, Real Estate Law, Trust Administration"
                onChange={(e) => setFormData({
                  ...formData,
                  practice_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'cpa':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpa_license">CPA License Number</Label>
                <Input
                  id="cpa_license"
                  placeholder="CPA-123456"
                  value={formData.cpa_license}
                  onChange={(e) => setFormData({...formData, cpa_license: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="years_practice">Years in Practice</Label>
                <Input
                  id="years_practice"
                  type="number"
                  value={formData.years_in_business}
                  onChange={(e) => setFormData({...formData, years_in_business: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tax_specialties">Tax Specialties (comma separated)</Label>
              <Input
                id="tax_specialties"
                placeholder="Estate Tax, Trust Tax, Capital Gains, Business Tax"
                onChange={(e) => setFormData({
                  ...formData,
                  tax_specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'stager':
        return (
          <>
            {commonFields}
            <div>
              <Label htmlFor="staging_inventory">Inventory Description</Label>
              <Input
                id="staging_inventory"
                placeholder="Full furniture inventory, 3 style collections"
                value={formData.staging_inventory}
                onChange={(e) => setFormData({...formData, staging_inventory: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="design_styles">Design Styles (comma separated)</Label>
              <Input
                id="design_styles"
                placeholder="Modern, Traditional, Farmhouse, Luxury"
                onChange={(e) => setFormData({
                  ...formData,
                  design_styles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
            <div>
              <Label htmlFor="certifications">Certifications (comma separated)</Label>
              <Input
                id="certifications"
                placeholder="ASP, RESA, IAHSP"
                onChange={(e) => setFormData({
                  ...formData,
                  vendor_certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'general_contractor':
      case 'handyman':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crew_size">Crew Size</Label>
                <Input
                  id="crew_size"
                  placeholder="5-10 workers"
                  value={formData.crew_size}
                  onChange={(e) => setFormData({...formData, crew_size: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="warranty">Warranty Offered</Label>
                <Input
                  id="warranty"
                  placeholder="1 year workmanship warranty"
                  value={formData.warranty_offered}
                  onChange={(e) => setFormData({...formData, warranty_offered: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="contractor_specialties">Specialties (comma separated)</Label>
              <Input
                id="contractor_specialties"
                placeholder="Remodeling, Repairs, Additions, Renovations"
                onChange={(e) => setFormData({
                  ...formData,
                  contractor_specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="emergency_services"
                checked={formData.emergency_services}
                onCheckedChange={(checked) => setFormData({...formData, emergency_services: checked})}
              />
              <Label htmlFor="emergency_services" className="cursor-pointer">24/7 Emergency Services</Label>
            </div>
          </>
        );

      case 'photographer':
        return (
          <>
            {commonFields}
            <div>
              <Label htmlFor="photography_packages">Photography Packages (comma separated)</Label>
              <Input
                id="photography_packages"
                placeholder="Basic ($150), Premium ($300), Luxury ($500)"
                onChange={(e) => setFormData({
                  ...formData,
                  photography_packages: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="drone_certified"
                  checked={formData.drone_certified}
                  onCheckedChange={(checked) => setFormData({...formData, drone_certified: checked})}
                />
                <Label htmlFor="drone_certified" className="cursor-pointer">FAA Part 107 Certified</Label>
              </div>
              <div>
                <Label htmlFor="report_turnaround">Photo Turnaround Time</Label>
                <Input
                  id="report_turnaround"
                  placeholder="24-48 hours"
                  value={formData.report_turnaround}
                  onChange={(e) => setFormData({...formData, report_turnaround: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="equipment">Equipment (comma separated)</Label>
              <Input
                id="equipment"
                placeholder="Full-frame camera, Drone, Video capability, 3D tours"
                onChange={(e) => setFormData({
                  ...formData,
                  equipment_owned: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'inspector':
      case 'appraiser':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certifications">Certifications (comma separated)</Label>
                <Input
                  id="certifications"
                  placeholder="ASHI, InterNACHI, State Certified"
                  onChange={(e) => setFormData({
                    ...formData,
                    vendor_certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
              <div>
                <Label htmlFor="report_turnaround">Report Turnaround</Label>
                <Input
                  id="report_turnaround"
                  placeholder="24-48 hours"
                  value={formData.report_turnaround}
                  onChange={(e) => setFormData({...formData, report_turnaround: e.target.value})}
                />
              </div>
            </div>
            {formData.vendor_type === 'inspector' && (
              <div>
                <Label htmlFor="inspection_types">Inspection Types (comma separated)</Label>
                <Input
                  id="inspection_types"
                  placeholder="General, Roof, Foundation, Pest, Septic, Pool"
                  onChange={(e) => setFormData({
                    ...formData,
                    inspection_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                />
              </div>
            )}
          </>
        );

      case 'hvac':
      case 'plumber':
      case 'electrician':
      case 'painter':
      case 'flooring':
      case 'roofer':
      case 'landscaper':
        return (
          <>
            {commonFields}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="crew_size">Crew Size</Label>
                <Input
                  id="crew_size"
                  placeholder="2-4 workers"
                  value={formData.crew_size}
                  onChange={(e) => setFormData({...formData, crew_size: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="warranty">Warranty Offered</Label>
                <Input
                  id="warranty"
                  placeholder="1 year parts & labor"
                  value={formData.warranty_offered}
                  onChange={(e) => setFormData({...formData, warranty_offered: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="emergency_services"
                checked={formData.emergency_services}
                onCheckedChange={(checked) => setFormData({...formData, emergency_services: checked})}
              />
              <Label htmlFor="emergency_services" className="cursor-pointer">24/7 Emergency Services</Label>
            </div>
            <div>
              <Label htmlFor="certifications">Certifications (comma separated)</Label>
              <Input
                id="certifications"
                placeholder="Manufacturer certifications, trade certifications"
                onChange={(e) => setFormData({
                  ...formData,
                  vendor_certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
              />
            </div>
          </>
        );

      case 'estate_liquidator':
      case 'storage':
        return (
          <>
            {commonFields}
            {formData.vendor_type === 'storage' && (
              <div>
                <Label htmlFor="storage_capacity">Storage Capacity</Label>
                <Input
                  id="storage_capacity"
                  placeholder="Climate controlled, 5,000 sq ft"
                  value={formData.staging_inventory}
                  onChange={(e) => setFormData({...formData, staging_inventory: e.target.value})}
                />
              </div>
            )}
            <div>
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                placeholder="Net 30, Credit cards accepted"
                value={formData.payment_terms}
                onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
              />
            </div>
          </>
        );

      default:
        return commonFields;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Vendor Details</h3>

      <div>
        <Label htmlFor="vendor_type">Vendor Type *</Label>
        <Select
          value={formData.vendor_type}
          onValueChange={(value) => setFormData({...formData, vendor_type: value})}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vendor type" />
          </SelectTrigger>
          <SelectContent>
            {VENDOR_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.vendor_type && (
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

          {renderVendorTypeFields()}
        </>
      )}
    </div>
  );
}