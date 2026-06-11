import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Info } from 'lucide-react';

export default function BatchImportDialog({ 
  totalRows, 
  existingCount, 
  totalBatches, 
  onConfirm, 
  onCancel 
}) {
  const projectedTotal = existingCount + totalRows;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            Ready to Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Current Listings in Table:</span>
              <Badge variant="outline" className="text-lg">{existingCount.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">New Records to Import:</span>
              <Badge className="bg-blue-600 text-lg">{totalRows.toLocaleString()}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
              <span className="text-sm font-semibold text-green-800">Total After Import:</span>
              <span className="text-xl font-bold text-green-700">{projectedTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-800">Batch Import Process</p>
            </div>
            <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
              <li>Records will be processed in <strong>{totalBatches} batches of 100</strong></li>
              <li>Review each batch results before continuing</li>
              <li>Or click "Import All Remaining" to auto-process all batches</li>
              <li>Includes duplicate detection, scoring & territory matching</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1 bg-purple-600 hover:bg-purple-700">
              Start First Batch →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}