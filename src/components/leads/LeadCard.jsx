import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, MapPin, Home, UserCheck, DollarSign, Clock } from 'lucide-react';

export default function LeadCard({ lead, onRoute }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-slate-600 bg-slate-100';
  };

  const getIntentIcon = (intent) => {
    switch (intent) {
      case 'sell_home': return Home;
      case 'invest': return TrendingUp;
      default: return UserCheck;
    }
  };

  const IntentIcon = getIntentIcon(lead.intent);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getScoreColor(lead.score || 0)}`}>
              <span className="text-xl font-bold">{lead.score || 0}</span>
            </div>
            <div>
              <h3 className="font-semibold text-navy-900 capitalize">
                {lead.intent?.replace(/_/g, ' ')}
              </h3>
              <Badge variant="outline" className="text-xs capitalize mt-1">
                {lead.source?.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          <IntentIcon className="w-5 h-5 text-gold-600" />
        </div>

        {lead.property_address && (
          <div className="flex items-start gap-2 text-sm text-slate-600 mb-3">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{lead.property_address}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
          {lead.estimated_value && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
              <p className="font-semibold text-navy-900">${lead.estimated_value.toLocaleString()}</p>
            </div>
          )}
          {lead.timeline && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Timeline</p>
              <p className="font-semibold text-navy-900 capitalize">{lead.timeline?.replace(/_/g, ' ')}</p>
            </div>
          )}
        </div>

        {lead.situation && (
          <Badge className="capitalize bg-purple-100 text-purple-800 mb-3">
            {lead.situation}
          </Badge>
        )}

        <div className="flex items-center justify-between">
          {lead.routed_to ? (
            <Badge className="bg-green-100 text-green-800">
              <UserCheck className="w-3 h-3 mr-1" />
              Assigned
            </Badge>
          ) : (
            <Button 
              onClick={() => onRoute(lead)}
              size="sm"
              className="bg-gold-600 hover:bg-gold-700"
            >
              Route Lead
            </Button>
          )}

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {new Date(lead.created_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}