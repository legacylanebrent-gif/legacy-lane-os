import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ACTIONS = [
  {
    id: 'terminate',
    label: 'Request Termination',
    variant: 'destructive',
    description: 'End this partnership agreement',
  },
  {
    id: 'review',
    label: 'Request Review',
    variant: 'outline',
    description: 'Evaluate partnership performance',
  },
  {
    id: 'non_exclusive',
    label: 'Convert to Non-Exclusive',
    variant: 'outline',
    description: 'Change partnership type',
  },
];

export default function PartnershipControls({ match, onUpdated }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleAction = async () => {
    setSubmitting(true);
    const res = await base44.functions.invoke(`requestPartnership${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}`, {
      match_id: match.id,
    });
    setSubmitting(false);
    
    if (res.data?.success) {
      setResult(res.data);
      onUpdated?.();
    }
  };

  if (result) {
    return (
      <Dialog open={true} onOpenChange={() => setResult(null)}>
        <DialogContent className="max-w-lg">
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{result.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{result.message}</p>
            </div>
            {result.details && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left text-sm space-y-2 text-slate-700">
                {Object.entries(result.details).map(([key, value]) => (
                  <p key={key}><span className="font-semibold">{key}:</span> {value}</p>
                ))}
              </div>
            )}
            <Button variant="ghost" onClick={() => setResult(null)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (selectedAction) {
    const action = ACTIONS.find(a => a.id === selectedAction);
    return (
      <Dialog open={true} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{action.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                {selectedAction === 'terminate' && 'Within 14 days of partnership start, termination is immediate. Otherwise, request goes under review.'}
                {selectedAction === 'review' && 'Partnership will be evaluated based on referral activity and response time metrics.'}
                {selectedAction === 'non_exclusive' && 'This changes your partnership type but does not affect non-circumvention obligations, which remain active.'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedAction(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={submitting}
                className={`flex-1 ${selectedAction === 'terminate' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
              >
                {submitting ? 'Processing…' : action.label}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-2">
      {ACTIONS.map(action => (
        <Button
          key={action.id}
          onClick={() => setSelectedAction(action.id)}
          variant={action.variant === 'destructive' ? 'outline' : action.variant}
          className={`w-full justify-start ${action.id === 'terminate' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}`}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}