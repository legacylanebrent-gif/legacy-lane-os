import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, MapPin, CheckCircle, Briefcase, Phone, Mail, Globe,
  TrendingUp, Clock, DollarSign, MessageSquare
} from 'lucide-react';

export default function VendorDetailModal({ open, onClose, vendor, onEdit, onMessage }) {
  if (!vendor) return null;

  const getTierBadge = (tier) => {
    const configs = {
      standard: { label: 'Standard', className: 'bg-slate-100 text-slate-700' },
      preferred: { label: 'Preferred', className: 'bg-blue-100 text-blue-700' },
      premier: { label: 'Premier', className: 'bg-orange-100 text-orange-700' }
    };
    const config = configs[tier] || configs.standard;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{vendor.company_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Header Info */}
          <div className="flex items-center gap-3">
            {getTierBadge(vendor.tier)}
            <Badge variant="outline">{vendor.vendor_type}</Badge>
            {vendor.insurance_verified && (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vendor.rating && (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  {vendor.rating.toFixed(1)}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {vendor.total_reviews || 0} reviews
                </div>
              </div>
            )}

            {vendor.jobs_completed && (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900">
                  <Briefcase className="w-5 h-5 text-cyan-600" />
                  {vendor.jobs_completed}
                </div>
                <div className="text-xs text-slate-600 mt-1">Jobs Completed</div>
              </div>
            )}

            {vendor.response_time_hours && (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900">
                  <Clock className="w-5 h-5 text-orange-600" />
                  {vendor.response_time_hours}h
                </div>
                <div className="text-xs text-slate-600 mt-1">Response Time</div>
              </div>
            )}

            {vendor.average_bid && (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-xl font-bold text-slate-900">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  {vendor.average_bid.toLocaleString()}
                </div>
                <div className="text-xs text-slate-600 mt-1">Avg Bid</div>
              </div>
            )}
          </div>

          {/* Services Offered */}
          {vendor.services_offered && vendor.services_offered.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Services Offered</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.services_offered.map((service, idx) => (
                  <Badge key={idx} variant="secondary">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Service Areas */}
          {vendor.service_areas && vendor.service_areas.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Service Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {vendor.service_areas.map((area, idx) => (
                  <Badge key={idx} variant="outline">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* License Info */}
          {vendor.license_number && (
            <div className="bg-slate-50 rounded-lg p-4">
              <span className="text-sm font-medium text-slate-700">License Number: </span>
              <span className="text-sm text-slate-900">{vendor.license_number}</span>
            </div>
          )}

          {/* Website */}
          {vendor.website && (
            <div>
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700"
              >
                <Globe className="w-4 h-4" />
                Visit Website
              </a>
            </div>
          )}

          {/* Revenue Share */}
          {vendor.revenue_share_rate && (
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-900">
                <TrendingUp className="w-4 h-4" />
                <span className="font-semibold">Revenue Share: {vendor.revenue_share_rate}%</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onMessage}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Message Vendor
            </Button>
            <Button
              onClick={onEdit}
              variant="outline"
              className="flex-1"
            >
              Edit Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}