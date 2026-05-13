import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Phone, Globe, MapPin, Star, ChevronDown, ChevronUp } from 'lucide-react';

export default function AgentOperatorOutreach({ application }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!application?.license_state) { setLoading(false); return; }

      // Get operators in the same state from FutureEstateOperator (outreach targets)
      const all = await base44.entities.FutureEstateOperator.filter({ state: application.license_state });

      // Filter to city matches if possible
      const cities = application.cities_requested
        ? application.cities_requested.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
        : [];

      let sorted = [...all];
      if (cities.length > 0) {
        sorted.sort((a, b) => {
          const aMatch = cities.some(c => a.city?.toLowerCase().includes(c) || c.includes(a.city?.toLowerCase()));
          const bMatch = cities.some(c => b.city?.toLowerCase().includes(c) || c.includes(b.city?.toLowerCase()));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }

      setOperators(sorted);
      setLoading(false);
    };
    load();
  }, [application]);

  const cities = application.cities_requested
    ? application.cities_requested.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
    : [];

  const visible = showAll ? operators : operators.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="w-5 h-5 text-orange-500" />
            Operators to Approach
          </CardTitle>
          {operators.length > 0 && (
            <Badge variant="outline" className="text-xs">{operators.length} in {application.license_state}</Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Estate sale companies in your territory — reach out to build partnerships and receive referral leads.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No estate sale operators found for {application.license_state} yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {visible.map(op => {
              const inTerritory = cities.length > 0 && cities.some(
                c => op.city?.toLowerCase().includes(c) || c.includes(op.city?.toLowerCase())
              );
              return (
                <div
                  key={op.id}
                  className={`rounded-lg px-4 py-3 border transition-colors ${
                    inTerritory
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-800 text-sm">{op.company_name}</p>
                        {inTerritory && (
                          <Badge className="bg-orange-500 text-white text-xs px-2 py-0">In Territory</Badge>
                        )}
                        {op.package_type && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-2.5 h-2.5 mr-1" />{op.package_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />{op.city}, {op.state}
                        </span>
                        {op.phone && (
                          <a href={`tel:${op.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Phone className="w-3 h-3" />{op.phone}
                          </a>
                        )}
                        {op.website_url && (
                          <a href={op.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Globe className="w-3 h-3" />Website
                          </a>
                        )}
                      </div>
                      {op.email && (
                        <a href={`mailto:${op.email}`} className="text-xs text-orange-600 hover:underline mt-0.5 block">
                          {op.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {operators.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-500 mt-1"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? <><ChevronUp className="w-4 h-4 mr-1" /> Show Less</>
                  : <><ChevronDown className="w-4 h-4 mr-1" /> Show All {operators.length} Operators</>
                }
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}