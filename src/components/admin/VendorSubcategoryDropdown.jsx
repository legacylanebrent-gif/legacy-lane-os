import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function VendorSubcategoryDropdown({ formData, setFormData }) {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubcategories();
  }, []);

  const loadSubcategories = async () => {
    try {
      const data = await base44.entities.AccountSubcategory.filter({ account_type: 'vendor' });
      const sorted = (data || []).sort((a, b) => {
        const nameA = a.subcategory_name || '';
        const nameB = b.subcategory_name || '';
        return nameA.localeCompare(nameB);
      });
      setSubcategories(sorted);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Label>Vendor Subcategory</Label>
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Label htmlFor="account_subcategory">Vendor Subcategory</Label>
      <Select
        value={formData.account_subcategory || ''}
        onValueChange={(value) => setFormData({ ...formData, account_subcategory: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select subcategory" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {subcategories.map(sub => (
            <SelectItem key={sub.id} value={sub.subcategory_name}>
              {sub.subcategory_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}