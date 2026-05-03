import React from 'react';
import DealCard from './DealCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DealPipelineBoard({ deals, stages, onStageChange }) {
  const getDealsByStage = (stageId) => deals.filter(d => d.stage === stageId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 overflow-x-auto pb-6">
      {stages.map(stage => {
        const stageDealList = getDealsByStage(stage.id);
        return (
          <div key={stage.id} className="flex-shrink-0 w-full lg:w-80">
            <div className={`${stage.color} rounded-xl p-4 min-h-96 flex flex-col`}>
              <div className="mb-4">
                <h3 className="font-bold text-slate-900 text-sm">{stage.label}</h3>
                <p className="text-xs text-slate-500 mt-1">{stageDealList.length} deals</p>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {stageDealList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">No deals</p>
                  </div>
                ) : (
                  stageDealList.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onStageChange={onStageChange}
                      stages={stages}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}