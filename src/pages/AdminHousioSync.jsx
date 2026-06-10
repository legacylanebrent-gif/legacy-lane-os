import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, CheckCircle, AlertCircle, ChevronRight, RefreshCw, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function AdminHousioSync() {
  const queryClient = useQueryClient();
  
  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState(null); // 'territories' or 'micro'
  const [result, setResult] = useState(null);
  
  // Batch state
  const [batchMode, setBatchMode] = useState(false);
  const [currentOffset, setCurrentOffset] = useState({ territories: 0, micro: 0 });
  const [batchResult, setBatchResult] = useState({ territories: null, micro: null });
  const [totalCount, setTotalCount] = useState({ territories: 0, micro: 0 });

  const { data: territories } = useQuery({
    queryKey: ['housio-territories'],
    queryFn: () => base44.entities.HousioTerritory.list(),
  });

  const { data: microTerritories } = useQuery({
    queryKey: ['housio-micro-territories'],
    queryFn: () => base44.entities.HousioMicroTerritory.list(),
  });

  const handleFullSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('syncHousioTerritories', { clear_first: true });
      setResult({ success: true, data: response.data });
      queryClient.invalidateQueries(['housio-territories', 'housio-micro-territories']);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const startBatchSync = (type) => {
    setSyncType(type);
    setBatchMode(true);
    setCurrentOffset(prev => ({ ...prev, [type]: 0 }));
    setBatchResult(prev => ({ ...prev, [type]: null }));
  };

  const syncBatch = async (type, clearFirst = false) => {
    setSyncing(true);
    const offset = currentOffset[type];
    
    try {
      const response = await base44.functions.invoke('syncHousioTerritories', {
        batch_type: type,
        offset: offset,
        limit: 100,
        clear_first: clearFirst,
      });
      
      const data = response.data;
      setBatchResult(prev => ({ ...prev, [type]: data }));
      setTotalCount(prev => ({ ...prev, [type]: data.total_count }));
      setCurrentOffset(prev => ({ ...prev, [type]: data.next_offset || offset }));
      queryClient.invalidateQueries([type === 'territories' ? 'housio-territories' : 'housio-micro-territories']);
    } catch (error) {
      setBatchResult(prev => ({ ...prev, [type]: { error: error.message } }));
    } finally {
      setSyncing(false);
    }
  };

  const resetBatch = (type) => {
    setBatchResult(prev => ({ ...prev, [type]: null }));
    setCurrentOffset(prev => ({ ...prev, [type]: 0 }));
    setTotalCount(prev => ({ ...prev, [type]: 0 }));
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSyncType(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Housio Territory Sync</h1>
            <p className="text-slate-600 mt-1">Synchronize territories and micro-territories from Housio</p>
          </div>
          <div className="flex gap-2">
            {batchMode && (
              <Button onClick={exitBatchMode} variant="outline" size="sm">
                <X className="w-4 h-4 mr-1" /> Exit Batch Mode
              </Button>
            )}
            {!batchMode && (
              <Button onClick={handleFullSync} disabled={syncing} className="bg-gold-600 hover:bg-gold-700">
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
            )}
          </div>
        </div>

        {result && !batchMode && (
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

        {/* Batch Mode UI */}
        {batchMode && (
          <div className="space-y-4">
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-purple-900">
                  Batch Sync: {syncType === 'territories' ? 'Territories' : 'Micro-Territories'}
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Syncing in batches of 100 to avoid rate limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-purple-800">
                      Progress: <strong>{currentOffset[syncType]}</strong> / {totalCount[syncType] || '...'}
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{ width: totalCount[syncType] ? `${(currentOffset[syncType] / totalCount[syncType]) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {currentOffset[syncType] === 0 ? (
                      <Button 
                        onClick={() => syncBatch(syncType, true)} 
                        disabled={syncing}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {syncing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 mr-2" />
                            Start Fresh Sync
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button 
                          onClick={() => syncBatch(syncType)} 
                          disabled={syncing || !batchResult[syncType]?.has_more}
                          variant={batchResult[syncType]?.has_more ? 'default' : 'ghost'}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Next 100
                            </>
                          )}
                        </Button>
                        {batchResult[syncType]?.has_more === false && (
                          <span className="text-green-700 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Complete!
                          </span>
                        )}
                      </>
                    )}
                    <Button 
                      onClick={() => resetBatch(syncType)} 
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Reset
                    </Button>
                  </div>
                </div>

                {batchResult[syncType] && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Last batch:</span> {batchResult[syncType].synced_count} records
                    </div>
                    <div>
                      <span className="text-purple-600">Offset:</span> {batchResult[syncType].offset} → {batchResult[syncType].next_offset || 'end'}
                    </div>
                    <div>
                      <span className="text-purple-600">Status:</span> {batchResult[syncType].error ? 'Error' : (batchResult[syncType].has_more ? 'More available' : 'Complete')}
                    </div>
                    {batchResult[syncType].error && (
                      <div className="col-span-3 text-red-700">
                        Error: {batchResult[syncType].error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Territories</CardTitle>
                <CardDescription>County-level from Housio</CardDescription>
              </div>
              <Database className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {territories?.length || 0}
              </div>
              {!batchMode && (
                <Button 
                  onClick={() => startBatchSync('territories')} 
                  variant="outline" 
                  size="sm"
                  className="mt-3"
                >
                  Batch Sync Territories
                </Button>
              )}
              <p className="text-sm text-slate-600 mt-2">
                Last updated: {territories?.[0]?.synced_at ? new Date(territories[0].synced_at).toLocaleString() : 'Never'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">Micro-Territories</CardTitle>
                <CardDescription>City/township-level divisions</CardDescription>
              </div>
              <Database className="w-4 h-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {microTerritories?.length || 0}
              </div>
              {!batchMode && (
                <Button 
                  onClick={() => startBatchSync('micro')} 
                  variant="outline" 
                  size="sm"
                  className="mt-3"
                >
                  Batch Sync Micro-Territories
                </Button>
              )}
              <p className="text-sm text-slate-600 mt-2">
                Last updated: {microTerritories?.[0]?.synced_at ? new Date(microTerritories[0].synced_at).toLocaleString() : 'Never'}
              </p>
            </CardContent>
          </Card>
        </div>

        {!batchMode && (
          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Full Sync:</strong> Deletes all existing records and fetches everything in one go (may hit rate limits)
              </p>
              <p>
                <strong>Batch Sync:</strong> Fetches 100 records at a time with manual NEXT button control to avoid rate limits
              </p>
              <p>
                <strong>Recommendation:</strong> Use batch sync for large datasets or if you experience API rate limiting
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}