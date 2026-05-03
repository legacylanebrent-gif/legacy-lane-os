import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, User, DollarSign, ChevronDown } from 'lucide-react';

export default function DealCard({ deal, onStageChange, stages }) {
  const [open, setOpen] = useState(false);

  const handleStageSelect = (newStage) => {
    onStageChange(deal.id, newStage);
    setOpen(false);
  };

  const estimatedValueDisplay = deal.estimated_value
    ? `$${(deal.estimated_value / 100).toLocaleString()}`
    : 'TBD';

  return (
    <Card className="bg-white shadow-sm border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{deal.property_address}</p>
            <p className="text-xs text-slate-500">{deal.client_name}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">{estimatedValueDisplay}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <User className="w-3 h-3" />
          <span className="truncate">Agent / Operator</span>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <Select value={deal.stage} onOpenChange={setOpen} open={open}>
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}