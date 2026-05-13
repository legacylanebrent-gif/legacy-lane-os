import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Map } from 'lucide-react';

const interestLabels = {
  preferred: 'Preferred Agent',
  exclusive: 'Exclusive Territory Owner',
  unsure: 'Exploring Options',
};

export default function AgentTerritorySection({ application }) {
  const cities = application.cities_requested
    ? application.cities_requested.split(',').map(c => c.trim()).filter(Boolean)
    : [];
  const county = application.county_requested;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Map className="w-5 h-5 text-orange-500" />
          Assigned Territory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary row */}
        <div className="flex flex-wrap gap-3">
          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-sm px-3 py-1">
            {interestLabels[application.interested_in] || application.interested_in}
          </Badge>
          {application.license_state && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              📍 {application.license_state}
            </Badge>
          )}
        </div>

        {/* Cities grid */}
        {cities.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Your Cities
            </p>
            <div className="flex flex-wrap gap-2">
              {cities.map((city, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-full px-3 py-1.5 text-sm font-medium">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  {city}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* County */}
        {county && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">County</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 font-medium text-sm">
              {county} County
            </div>
          </div>
        )}

        {/* Visual territory card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-2 w-32 h-32 rounded-full border-4 border-white" />
            <div className="absolute top-8 right-8 w-20 h-20 rounded-full border-2 border-white" />
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Territory Summary</p>
          <p className="text-2xl font-bold text-white">{cities.length || 1} {cities.length === 1 ? 'City' : cities.length > 1 ? 'Cities' : 'County'}</p>
          <p className="text-slate-300 text-sm mt-1">{application.license_state} · {interestLabels[application.interested_in]}</p>
          {application.avg_sale_price && (
            <p className="text-orange-400 font-semibold mt-3 text-sm">
              Avg Sale Price: ${Number(application.avg_sale_price).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}