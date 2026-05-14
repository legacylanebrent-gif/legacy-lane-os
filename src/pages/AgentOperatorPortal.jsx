import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, Send, BarChart2, FileText, Map, MapPin } from 'lucide-react';
import PortalInviteTab from '@/components/agentportal/PortalInviteTab';
import PortalPartnershipsTab from '@/components/agentportal/PortalPartnershipsTab';
import PortalAnalyticsTab from '@/components/agentportal/PortalAnalyticsTab';
import PortalAgreementsTab from '@/components/agentportal/PortalAgreementsTab';
import TerritoryMapView from '@/components/agentportal/TerritoryMapView';
import TerritoryCitiesTab from '@/components/agentportal/TerritoryCitiesTab';

export default function AgentOperatorPortal() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Estate Sale Company Partners</h1>
              <p className="text-slate-500 text-sm">Invite, connect, and manage your estate sale operator network</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto gap-1 flex-wrap">
            <TabsTrigger value="invite" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Send className="w-4 h-4" /> Invite Operators
            </TabsTrigger>
            <TabsTrigger value="partnerships" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Users className="w-4 h-4" /> My Partnerships
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <BarChart2 className="w-4 h-4" /> Shared Analytics
            </TabsTrigger>
            <TabsTrigger value="agreements" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <FileText className="w-4 h-4" /> Agreements & Rewards
            </TabsTrigger>
            <TabsTrigger value="cities" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <MapPin className="w-4 h-4" /> Territory Cities
            </TabsTrigger>
            <TabsTrigger value="territory" className="flex items-center gap-2 rounded-lg px-4 py-2.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Map className="w-4 h-4" /> Territory Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite"><PortalInviteTab user={user} /></TabsContent>
          <TabsContent value="partnerships"><PortalPartnershipsTab user={user} /></TabsContent>
          <TabsContent value="analytics"><PortalAnalyticsTab user={user} /></TabsContent>
          <TabsContent value="agreements"><PortalAgreementsTab user={user} /></TabsContent>
          <TabsContent value="cities"><TerritoryCitiesTab user={user} /></TabsContent>
          <TabsContent value="territory"><TerritoryMapView user={user} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}