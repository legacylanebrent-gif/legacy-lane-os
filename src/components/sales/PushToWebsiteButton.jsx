import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The operator website refuses to create a listing for a sale it has never seen
// ("unknown sale, no auto-create"), so a first-time push can never succeed — the
// sale has to be pulled once from the website's own admin first. Pressing the
// button therefore only explains that, instead of firing a push that must fail.
export default function PushToWebsiteButton({ className = '' }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowHelp(true)}
        className="self-start"
      >
        <Globe className="w-3.5 h-3.5" />
        Push to Website
      </Button>
      {showHelp && (
        <p className="text-xs text-slate-500 max-w-md">
          To put this sale on your website, go to your website admin and pull it there first.
        </p>
      )}
    </div>
  );
}