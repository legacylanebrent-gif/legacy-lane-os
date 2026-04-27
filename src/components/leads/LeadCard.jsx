import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, MapPin, Home, UserCheck, Clock, Mail, Phone, User, DollarSign } from 'lucide-react';

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600 bg-green-100';
  if (score >= 60) return 'text-amber-600 bg-amber-100';
  return 'text-slate-600 bg-slate-100';
};

export default function LeadCard({ lead, onRoute, onClick, assignedOperator }) {
  const getIntentIcon = (intent) => {
    switch (intent) {
      case 'sell_home': return Home;
      case 'invest': return TrendingUp;
      default: return UserCheck;
    }
  };

  const IntentIcon = getIntentIcon(lead.intent);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-5">
        {/* Header: score + intent */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getScoreColor(lead.score || 0)}`}>
              <span className="text-xl font-bold">{lead.score || 0}</span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 capitalize">
                {lead.intent?.replace(/_/g, ' ')}
              </h3>
              <Badge variant="outline" className="text-xs capitalize mt-1">
                {lead.source?.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          <IntentIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
        </div>

        {/* Contact info */}
        <div className="space-y-1.5 mb-3">
          {lead.contact_name && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="font-medium">{lead.contact_name}</span>
            </div>
          )}
          {lead.contact_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <a
                href={`mailto:${lead.contact_email}`}
                onClick={(e) => e.stopPropagation()}
                className="text-cyan-600 hover:underline truncate"
              >
                {lead.contact_email}
              </a>
            </div>
          )}
          {lead.contact_phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <a
                href={`tel:${lead.contact_phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-cyan-600 hover:underline"
              >
                {lead.contact_phone}
              </a>
            </div>
          )}
          {lead.property_address && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{lead.property_address}</span>
            </div>
          )}
        </div>

        {/* Value + Timeline + Referral Fee */}
        {(lead.estimated_value || lead.timeline || lead.estimated_referral_fee) && (
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b">
            {lead.estimated_value && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Est. Value</p>
                <p className="font-semibold text-slate-900 text-sm">${lead.estimated_value.toLocaleString()}</p>
              </div>
            )}
            {lead.timeline && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Timeline</p>
                <p className="font-semibold text-slate-900 text-sm capitalize">{lead.timeline?.replace(/_/g, ' ')}</p>
              </div>
            )}
            {lead.estimated_referral_fee && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />Referral Fee
                </p>
                <p className="font-semibold text-green-700 text-sm">${lead.estimated_referral_fee.toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Situation badge */}
        {lead.situation && (
          <Badge className="capitalize bg-purple-100 text-purple-800 mb-3">
            {lead.situation}
          </Badge>
        )}

        {/* Footer: status + date */}
        <div className="flex items-center justify-between">
          {lead.converted ? (
            <Badge className="bg-green-100 text-green-800">Converted</Badge>
          ) : lead.routed_to ? (
            <div className="text-xs text-slate-600">
              <Badge className="bg-cyan-100 text-cyan-800">
                <UserCheck className="w-3 h-3 mr-1" />
                {assignedOperator ? (assignedOperator.company_name || assignedOperator.full_name) : 'Assigned'}
              </Badge>
            </div>
          ) : (
            <Button
              onClick={(e) => { e.stopPropagation(); onRoute(lead); }}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-xs h-7 px-2"
            >
              Route Lead
            </Button>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {new Date(lead.created_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}