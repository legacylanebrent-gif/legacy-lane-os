import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Pushes ONE sale to the sale company's website destination (e.g. legacylanesales.com).
// All state lives in the certified publication service behind the publishSale function.
export default function PushToWebsiteButton({ sale, className = '' }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function push() {
    setBusy(true);
    try {
      const statusRes = await base44.functions.invoke('publishSale', { action: 'status', sale_id: sale.id });
      const data = statusRes?.data || {};
      const existing = (data.publications || [])[0];
      const candidates = (data.available_destinations || []).filter(d => d.status === 'active');
      const destination =
        candidates.find(d => existing && d.id === existing.destination?.id) ||
        candidates.find(d => d.destination_type === 'operator_website') ||
        candidates[0];

      if (!destination) throw new Error('No website destination is connected for this sale');

      const res = await base44.functions.invoke('publishSale', {
        action: 'publish',
        sale_id: sale.id,
        destination_id: destination.id
      });
      const out = res?.data || {};
      if (out.error) throw new Error(out.error);

      toast({ title: 'Pushed to your website', description: `${sale.title} → ${destination.name}` });
    } catch (error) {
      toast({
        title: 'Could not push this sale',
        description: error?.response?.data?.error || error?.message || 'Try again',
        variant: 'destructive'
      });
    } finally {
      setBusy(false);
    }
  }

  // Draft and archived sales are never published to a website.
  const blocked = ['draft', 'archived'].includes(sale.status);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={push}
      disabled={busy || blocked}
      title={blocked ? 'Publish the sale (upcoming or active) before pushing it to your website' : undefined}
      className={className}
    >
      <Globe className="w-3 h-3 mr-1 flex-shrink-0" />
      {busy ? 'Pushing...' : 'Push to Website'}
    </Button>
  );
}