import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function AdminHousioSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: territories } = useQuery({
    queryKey: ['housio-territories'],
    queryFn: () => base44.entities.HousioTerritory.list(),
  });

  const { data: microTerritories } = useQuery({
    queryKey: ['housio-micro-territories'],
    queryFn: () => base44.entities.HousioMicroTerritory.list(),
  });

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('syncHousioTerritories', {});
      setResult({ success: true, data: response.data });
      queryClient.invalidateQueries(['housio-territories', 'housio-micro-territories']);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Housio Territory Sync</h1>
            <p className="text-slate-600 mt-1">One-time synchronization of territories and micro-territories from Housio</p>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="bg-gold-600 hover:bg-gold-700">
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Run Full Sync
              </>
            )}
          </Button>
        </div>

        {result && (
          <Card className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {result.success ? 'Sync Completed Successfully' : 'Sync Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success && (
                <div className="space-y-2 text-sm">
                  <p><strong>Territories synced:</strong> {result.data.territories_synced}</p>
                  <p><strong>Micro-territories synced:</strong> {result.data.micro_territories_synced}</p>
                  <p><strong>Synced at:</strong> {new Date(result.data.synced_at).toLocaleString()}</p>
                </div>
              )}
              {!result.success && (
                <p className="text-red-700">{result.error}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Territories</CardTitle>
              <CardDescription>County-level territories from Housio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {territories?.length || 0}
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Last updated: {territories?.[0]?.synced_at ? new Date(territories[0].synced_at).toLocaleString() : 'Never'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Micro-Territories</CardTitle>
              <CardDescription>City/township-level divisions with city lists</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {microTerritories?.length || 0}
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Last updated: {microTerritories?.[0]?.synced_at ? new Date(microTerritories[0].synced_at).toLocaleString() : 'Never'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Step 1:</strong> Fetches all territories (county-level) from Housio API
            </p>
            <p>
              <strong>Step 2:</strong> Fetches all micro-territories (city/township lists) from Housio API
            </p>
            <p>
              <strong>Step 3:</strong> Deletes existing local records and creates fresh copies in EstateSalen entities
            </p>
            <p>
              <strong>Benefits:</strong> Eliminates repeated API calls, improves page load times, enables offline territory lookups
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}