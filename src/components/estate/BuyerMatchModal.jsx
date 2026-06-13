import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCheck, Users } from 'lucide-react';

export default function BuyerMatchModal({ open, onClose, matchData }) {
  if (!matchData) return null;

  const hasMatches = matchData.matchCount > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasMatches ? (
              <Users className="w-5 h-5 text-emerald-600" />
            ) : (
              <UserCheck className="w-5 h-5 text-slate-400" />
            )}
            {hasMatches ? 'Buyer Matches Found' : 'No Matches Yet'}
          </DialogTitle>
          <DialogDescription>
            {matchData.message || (hasMatches
              ? `${matchData.matchCount} buyer${matchData.matchCount > 1 ? 's' : ''} matched! Check your notifications.`
              : "No active buyer matches found. Try adding more items and categories to your sale."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className={hasMatches ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}