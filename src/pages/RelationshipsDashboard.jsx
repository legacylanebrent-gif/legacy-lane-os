import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, MessageSquare, TrendingUp, AlertCircle, CheckCircle2, 
  Clock, ArrowRight, RefreshCw, Mail, Phone, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const HEALTH_COLORS = {
  very_high: 'bg-green-100 text-green-700 border-green-300',
  high: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-orange-100 text-orange-700 border-orange-300',
  very_low: 'bg-red-100 text-red-700 border-red-300'
};

const STATUS_COLORS = {
  active_partner: 'bg-green-600',
  initial_contact: 'bg-blue-600',
  prospect: 'bg-slate-600',
  at_risk: 'bg-red-600',
  dormant: 'bg-gray-600'
};

export default function RelationshipsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [connections, setConnections] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [healthRes, connectionsList] = await Promise.all([
        base44.functions.invoke('calculateAllRelationshipHealth', {}),
        base44.entities.Connection.filter({ account_owner_id: userData.id, status: 'connected' })
      ]);

      if (healthRes.data?.success) {
        setHealthData(healthRes.data);
      }

      // Enrich connections with health data
      const enriched = connectionsList.map(conn => {
        const health = healthRes.data?.health_records?.find(r => r.connection.id === conn.id);
        return { ...conn, health: health?.health };
      });

      setConnections(enriched);
    } catch (error) {
      console.error('Error loading relationships:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading relationships...</div>
      </div>
    );
  }

  const summary = healthData?.summary || {};

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Relationship Intelligence</h1>
            <p className="text-slate-600 mt-1">
              Monitor partnership health and nurture valuable connections
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.very_high || 0}</p>
                  <p className="text-xs text-slate-500">Very High Health</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.high || 0}</p>
                  <p className="text-xs text-slate-500">High Health</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.moderate || 0}</p>
                  <p className="text-xs text-slate-500">Moderate Health</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.needs_followup || 0}</p>
                  <p className="text-xs text-slate-500">Needs Follow-up</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{summary.at_risk || 0}</p>
                  <p className="text-xs text-slate-500">At Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({connections.length})</TabsTrigger>
            <TabsTrigger value="active_partner">Active Partners</TabsTrigger>
            <TabsTrigger value="at_risk">At Risk</TabsTrigger>
            <TabsTrigger value="needs_followup">Needs Follow-up</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {connections.map((conn) => (
                  <ConnectionCard key={conn.id} connection={conn} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="active_partner" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {connections
                  .filter(c => c.health?.partnership_status === 'active_partner')
                  .map((conn) => (
                    <ConnectionCard key={conn.id} connection={conn} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="at_risk" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {connections
                  .filter(c => c.health?.partnership_status === 'at_risk')
                  .map((conn) => (
                    <ConnectionCard key={conn.id} connection={conn} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="needs_followup" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {connections
                  .filter(c => c.health?.next_follow_up_date <= new Date().toISOString().split('T')[0])
                  .map((conn) => (
                    <ConnectionCard key={conn.id} connection={conn} />
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConnectionCard({ connection }) {
  const health = connection.health;

  if (!health) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-slate-500">No health data available</p>
        </CardContent>
      </Card>
    );
  }

  const healthColor = HEALTH_COLORS[health.engagement_level] || HEALTH_COLORS.moderate;
  const statusColor = STATUS_COLORS[health.partnership_status] || STATUS_COLORS.prospect;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${statusColor}`} title={health.partnership_status} />
              <h3 className="font-semibold text-slate-900">{connection.connected_user_name || 'User'}</h3>
              <Badge className={healthColor}>{health.engagement_level.replace('_', ' ')}</Badge>
              <Badge variant="outline">{health.partnership_status.replace('_', ' ')}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Health Score</p>
                <p className="font-semibold text-slate-900">{health.health_score}/100</p>
              </div>
              <div>
                <p className="text-slate-500">Messages</p>
                <p className="font-semibold text-slate-900">{health.total_messages_exchanged}</p>
              </div>
              <div>
                <p className="text-slate-500">Last Contact</p>
                <p className="font-semibold text-slate-900">{health.days_since_last_contact}d ago</p>
              </div>
              <div>
                <p className="text-slate-500">Next Follow-up</p>
                <p className="font-semibold text-slate-900">
                  {health.next_follow_up_date ? format(new Date(health.next_follow_up_date), 'MMM d') : 'N/A'}
                </p>
              </div>
            </div>

            {/* AI Insights */}
            {health.ai_insights_json && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                {health.ai_insights_json.recommendations?.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-slate-700">{health.ai_insights_json.recommendations[0]}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" className="gap-2">
              <MessageSquare className="w-3 h-3" />
              Message
            </Button>
            {health.days_since_last_contact > 14 && (
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2">
                <Mail className="w-3 h-3" />
                Follow Up
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}