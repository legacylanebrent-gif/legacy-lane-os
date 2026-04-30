import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Save, Edit2, RefreshCw, CheckCircle2, Clock, MessageSquare, MoreVertical, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function AIOutputActions({
  content,
  contentType,
  onCopy,
  onRegenerate,
  onEdit,
  onSaveToHistory,
  onSaveToSale,
  onSaveToCalendar,
  onToggleApproved,
  onToggleUsed,
  onAddNotes,
  isApproved = false,
  isUsed = false,
  isEditing = false,
  isSaving = false,
  onEditSave,
  onEditCancel,
  editValue,
  onEditChange,
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAddNotes = async () => {
    if (onAddNotes) {
      await onAddNotes(notes);
      setNotes('');
      setShowNotes(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Edit mode */}
      {isEditing && (
        <div className="space-y-2 bg-slate-800 rounded-lg p-3 border border-slate-700">
          <Textarea
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white min-h-24"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onEditCancel}
              className="flex-1"
            >
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={onEditSave}
              disabled={isSaving}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isEditing && (
        <>
          {/* Main actions row */}
          <div className="flex gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={onCopy}
              className="flex-1 min-w-20"
              title="Copy to clipboard"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="flex-1 min-w-20"
              title="Edit content"
            >
              <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              className="flex-1 min-w-20"
              title="Regenerate content"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Regen
            </Button>

            <Button
              size="sm"
              variant={isApproved ? 'default' : 'outline'}
              onClick={onToggleApproved}
              className={`flex-1 min-w-20 ${isApproved ? 'bg-green-600 hover:bg-green-700' : ''}`}
              title={isApproved ? 'Remove approval' : 'Mark as approved'}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" /> {isApproved ? 'Approved' : 'Approve'}
            </Button>

            <Button
              size="sm"
              variant={isUsed ? 'default' : 'outline'}
              onClick={onToggleUsed}
              className={`flex-1 min-w-20 ${isUsed ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              title={isUsed ? 'Mark as unused' : 'Mark as used'}
            >
              <Clock className="w-3 h-3 mr-1" /> {isUsed ? 'Used' : 'Use'}
            </Button>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="w-9 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                <DropdownMenuItem onClick={onSaveToHistory} className="text-slate-200 hover:bg-slate-700 cursor-pointer">
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save to Content History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveToSale} className="text-slate-200 hover:bg-slate-700 cursor-pointer">
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save to Sale Record
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSaveToCalendar} className="text-slate-200 hover:bg-slate-700 cursor-pointer">
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save to Marketing Calendar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem onClick={() => setShowNotes(!showNotes)} className="text-slate-200 hover:bg-slate-700 cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />
                  Add Performance Notes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Notes section */}
          {showNotes && (
            <div className="space-y-2 bg-slate-800 rounded-lg p-3 border border-slate-700">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add performance notes about this content (how it performed, what worked, etc.)…"
                className="bg-slate-900 border-slate-600 text-white text-xs min-h-20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setShowNotes(false); setNotes(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNotes}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}