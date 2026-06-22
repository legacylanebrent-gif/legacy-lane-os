import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gavel, MapPin, DollarSign, Clock, Package, Truck, Users } from 'lucide-react';

export default function BuyoutEventSection({ buyoutConfig, onChange }) {
  const cfg = buyoutConfig || {};

  const update = (field, value) => {
    onChange({ ...cfg, [field]: value });
  };

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-amber-50/30">
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
            <Gavel className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Buyout Event Configuration</h2>
            <p className="text-sm text-slate-500">Configure how resellers will bid on this buyout</p>
          </div>
        </div>

        {/* Bid Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              Bid Deadline *
            </Label>
            <Input
              type="datetime-local"
              value={cfg.bid_deadline ? cfg.bid_deadline.replace('Z', '').slice(0, 16) : ''}
              onChange={(e) => update('bid_deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
              placeholder="When bids close"
            />
            <p className="text-xs text-slate-400 mt-1">Resellers must submit bids before this date/time</p>
          </div>

          {/* Pickup Deadline */}
          <div>
            <Label className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              Pickup Deadline
            </Label>
            <Input
              type="date"
              value={cfg.pickup_deadline || ''}
              onChange={(e) => update('pickup_deadline', e.target.value || null)}
              placeholder="Date by which items must be removed"
            />
            <p className="text-xs text-slate-400 mt-1">Winning bidder must remove all items by this date</p>
          </div>
        </div>

        {/* Buyout Mode */}
        <div>
          <Label className="flex items-center gap-1.5 mb-2">
            <Package className="w-3.5 h-3.5 text-orange-600" />
            Buyout Mode
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('buyout_mode', 'full_buyout')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                cfg.buyout_mode === 'full_buyout'
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-slate-200 hover:border-orange-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-slate-900">Full Buyout</span>
              </div>
              <p className="text-xs text-slate-500">All or nothing — bidder takes everything as a single lot</p>
            </button>
            <button
              type="button"
              onClick={() => update('buyout_mode', 'cherry_pick')}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                cfg.buyout_mode === 'cherry_pick'
                  ? 'border-orange-500 bg-orange-50 shadow-sm'
                  : 'border-slate-200 hover:border-orange-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-slate-900">Cherry Pick</span>
              </div>
              <p className="text-xs text-slate-500">Resellers can bid on individual items or sections</p>
            </button>
          </div>
        </div>

        {/* Pricing & Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-orange-600" />
              Minimum Bid ($)
            </Label>
            <Input
              type="number"
              min="0"
              value={cfg.minimum_bid ?? ''}
              onChange={(e) => update('minimum_bid', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-orange-600" />
              Est. Total Value ($)
            </Label>
            <Input
              type="number"
              min="0"
              value={cfg.estimated_total_value ?? ''}
              onChange={(e) => update('estimated_total_value', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="0"
            />
          </div>
          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-600" />
              Reseller Radius (mi)
            </Label>
            <Input
              type="number"
              min="5"
              max="500"
              value={cfg.reseller_radius_miles ?? 25}
              onChange={(e) => update('reseller_radius_miles', e.target.value ? parseInt(e.target.value) : 25)}
              placeholder="25"
            />
            <p className="text-xs text-slate-400 mt-1">Notify resellers within this radius</p>
          </div>
        </div>

        {/* Inventory Summary */}
        <div>
          <Label>Inventory Summary</Label>
          <Textarea
            value={cfg.inventory_summary || ''}
            onChange={(e) => update('inventory_summary', e.target.value)}
            placeholder="Briefly describe what's included in the buyout — e.g. '3-bedroom home contents: furniture, kitchenware, tools, garage items, garden equipment'"
            className="min-h-[80px]"
          />
        </div>

        {/* Highlights */}
        <div>
          <Label>Notable / High-Value Items</Label>
          <Textarea
            value={cfg.highlights || ''}
            onChange={(e) => update('highlights', e.target.value)}
            placeholder="Highlight key items to attract resellers — e.g. 'Antique mahogany dining set, vintage Rolex, Mid-Century modern furniture, original artwork'"
            className="min-h-[60px]"
          />
        </div>

        {/* Payment Terms */}
        <div>
          <Label>Payment Terms</Label>
          <Select
            value={cfg.payment_terms || ''}
            onValueChange={(v) => update('payment_terms', v)}
          >
            <SelectTrigger><SelectValue placeholder="Select payment terms..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash Only</SelectItem>
              <SelectItem value="certified_check">Certified Check</SelectItem>
              <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
              <SelectItem value="cash_or_certified">Cash or Certified Check</SelectItem>
              <SelectItem value="cash_or_wire">Cash or Wire Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reseller Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <Label className="flex items-center gap-1.5 cursor-pointer">
                <Users className="w-3.5 h-3.5 text-orange-600" />
                Registration Required
              </Label>
              <p className="text-xs text-slate-400">Resellers must register before bidding</p>
            </div>
            <Switch
              checked={cfg.reseller_registration_required ?? true}
              onCheckedChange={(v) => update('reseller_registration_required', v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div>
              <Label className="flex items-center gap-1.5 cursor-pointer">
                <Truck className="w-3.5 h-3.5 text-orange-600" />
                Cleanout Required
              </Label>
              <p className="text-xs text-slate-400">Property must be completely emptied</p>
            </div>
            <Switch
              checked={cfg.cleanout_required ?? false}
              onCheckedChange={(v) => update('cleanout_required', v)}
            />
          </div>
        </div>

        {/* Max Reseller Spots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-orange-600" />
              Max Reseller Spots
            </Label>
            <Input
              type="number"
              min="1"
              value={cfg.max_reseller_spots ?? ''}
              onChange={(e) => update('max_reseller_spots', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="No limit"
            />
            <p className="text-xs text-slate-400 mt-1">Leave empty for unlimited</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}