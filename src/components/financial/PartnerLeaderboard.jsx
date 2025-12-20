import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp } from 'lucide-react';

export default function PartnerLeaderboard({ users, revenueEvents }) {
  const userRevenue = revenueEvents.reduce((acc, event) => {
    acc[event.user_id] = (acc[event.user_id] || 0) + (event.net_amount || 0);
    return acc;
  }, {});

  const partners = users
    .filter(u => u.primary_role && ['real_estate_agent', 'estate_sale_operator', 'investor', 'coach'].includes(u.primary_role))
    .map(user => ({
      ...user,
      revenue: userRevenue[user.id] || 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold-600" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {partners.map((partner, index) => {
            const initials = partner.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
            
            return (
              <div key={partner.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-gold-600 text-white' :
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <Avatar>
                    <AvatarFallback className="bg-navy-900 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h4 className="font-semibold text-navy-900">{partner.full_name}</h4>
                    <Badge variant="outline" className="text-xs capitalize">
                      {partner.primary_role?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-navy-900">
                    ${partner.revenue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    <span>+15%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}