import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, 
  MessageSquare, Users, Calendar, Mail, Phone, ExternalLink,
  RefreshCw, ArrowRight, Star, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const HEALTH_COLORS = {
  very_high: 'bg-green-100 text-green-800 border-green-300',
  high: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-orange-100 text-orange-800 border-orange-300',
  very_low: 'bg-red-100 text-red-800 border-red-300'
};

const STATUS_COLORS = {
  active_partner: 'bg-green-600 text-white',
  initial_contact: 'bg-blue-600 text-white',
  prospect: 'bg-slate-600 text-white',
  at_risk: 'bg-red-600 text-white',
  dormant: 'bg-gray-500 text-white'
};

function HealthScoreGauge({ score }) {
  const percentage = score;
  const color = score >= 80 ? 'text-green-600' : score >= 65 ? 'text-emerald-600' : score >= 45 ? 'text-yellow-600' : score >= 25 ? 'text-orange-600' : 'text-red-600';
  
  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 transform -rotate-90">
        <circle
          className="text-slate-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="32"
          cx="40"
          cy="40"
        />
        <circle
          className={color}
          strokeWidth="8"
          strokeDasharray={201}
          strokeDashoffset={201 - (201 * percentage) / 100}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="32"
          cx="40"
          cy="40"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}

function RelationshipCard({ record, onRefresh, onMessage }) {
  const connection = record.connection;
  const health = record.health;
  
  const partnerName = connection.connected_user_name || connection.connected_user_email || 'Unknown';
  const partnerEmail = connection.connected_user_email;
  const partnerPhone = connection.connected_user_phone;
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
              {partnerName.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <CardTitle className="text-lg">{partnerName}</CardTitle>
              <p className="text-sm text-slate-500">{connection.connection_type} • {connection.account_owner_type}</p>
            </div>
          </div>
          <Badge className={STATUS_COLORS[health.partnership_status]}>
            {health.partnership_status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Health Score */}
        <div className="flex items-center gap-4">
          <HealthScoreGauge score={health.health_score} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Relationship Health</span>
            </div>
            <Badge className={HEALTH_COLORS[health.engagement_level]}>
              {health.engagement_level.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <MessageSquare className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            <div className="font-semibold text-slate-900">{health.total_messages_exchanged}</div>
            <div className="text-xs text-slate-500">Messages</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            <div className="font-semibold text-slate-900">{health.days_since_last_contact}</div>
            <div className="text-xs text-slate-500">Days</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-slate-400" />
            <div className="font-semibold text-slate-900 text-xs">
              {health.next_follow_up_date ? format(new Date(health.next_follow_up_date), 'MMM d') : 'N/A'}
            </div>
            <div className="text-xs text-slate-500">Follow-up</div>
          </div>
        </div>

        {/* AI Insights */}
        {health.ai_insights_json && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            {health.ai_insights_json.recommendations?.[0] && (
              <div className="flex items-start gap-2 text-xs text-blue-800">
                <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{health.ai_insights_json.recommendations[0]}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onMessage(connection)}
            className="flex-1"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Message
          </Button>
          {partnerEmail && (
            <Button size="sm" variant="outline" className="flex-1">
              <Mail className="w-3 h-3 mr-1" />
              Email
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => onRefresh(connection.id)}
            title="Refresh health score"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RelationshipHealthDashboard() {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['relationshipHealth'],
    queryFn: () => base44.functions.invoke('calculateAllRelationshipHealth', {})
  });

  const refreshHealth = useMutation({
    mutationFn: (connectionId) => base44.functions.invoke('calculateRelationshipHealth', { connection_id: connectionId }),
    onSuccess: () => {
      refetch();
    }
  });

  const handleRefresh = (connectionId) => {
    refreshHealth.mutate(connectionId);
  };

  const handleMessage = (connection) => {
    // Open message modal - would integrate with existing MessageModal
    console.log('Opening message modal for:', connection);
    alert(`Message modal would open for ${connection.connected_user_name}`);
  };

  if (!healthData?.success) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">No Relationship Data Yet</h2>
          <p className="text-slate-500 mt-2">Start building connections to see relationship health metrics</p>
        </div>
      </div>
    );
  }

  const { health_records, summary } = healthData;
  
  let filteredRecords = health_records;
  if (filter === 'at_risk') {
    filteredRecords = health_records.filter(r => r.health.partnership_status === 'at_risk');
  } else if (filter === 'needs_followup') {
    const today = new Date().toISOString().split('T')[0];
    filteredRecords = health_records.filter(r => r.health.next_follow_up_date <= today);
  } else if (filter === 'high_value') {
    filteredRecords = health_records.filter(r => r.health.health_score >= 65);
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Relationship Health</h1>
            <p className="text-slate-600 mt-1">Monitor and nurture your partnership ecosystem</p>
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <div className="text-2xl font-bold text-slate-900">{summary.very_high}</div>
                <div className="text-xs text-slate-500">Very High</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                <div className="text-2xl font-bold text-slate-900">{summary.high}</div>
                <div className="text-xs text-slate-500">High</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <Activity className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-slate-900">{summary.moderate}</div>
                <div className="text-xs text-slate-500">Moderate</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <TrendingDown className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold text-slate-900">{summary.low}</div>
                <div className="text-xs text-slate-500">Low</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <div className="text-2xl font-bold text-slate-900">{summary.at_risk}</div>
                <div className="text-xs text-slate-500">At Risk</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold text-slate-900">{summary.needs_followup}</div>
                <div className="text-xs text-slate-500">Needs Follow-up</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={setFilter} className="mb-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({health_records.length})</TabsTrigger>
            <TabsTrigger value="high_value">High Value ({summary.very_high + summary.high})</TabsTrigger>
            <TabsTrigger value="at_risk">At Risk ({summary.at_risk})</TabsTrigger>
            <TabsTrigger value="needs_followup">Needs Follow-up ({summary.needs_followup})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Relationship Cards */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">No relationships in this filter</h3>
            <p className="text-slate-500 mt-2">Try adjusting your filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map((record) => (
              <RelationshipCard
                key={record.connection.id}
                record={record}
                onRefresh={handleRefresh}
                onMessage={handleMessage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}