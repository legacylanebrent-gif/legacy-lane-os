import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

// Extracted from SaleEditor's info tab — the save/publish footer buttons.
export default function SaleEditorFooter({ saving, onHandleSave, onPublish }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pb-8">
      <Button onClick={() => onHandleSave(true)} disabled={saving} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 order-1">
        {saving ? 'Saving...' : 'Save & Close'}
      </Button>
      <Button onClick={onPublish} disabled={saving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white order-2">
        <Rocket className="w-4 h-4 mr-2" />
        {saving ? 'Publishing...' : 'Publish Sale'}
      </Button>
      <Button variant="outline" onClick={() => onHandleSave(false)} disabled={saving} className="w-full sm:w-auto order-3">
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button variant="outline" onClick={() => navigate(createPageUrl('MySales'))} className="w-full sm:w-auto order-4">Cancel</Button>
    </div>
  );
}