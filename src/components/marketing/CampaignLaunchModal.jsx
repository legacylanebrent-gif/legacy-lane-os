import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Circle, Rocket, Copy, Download, Share2, Megaphone, Users, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CHECKLIST_ITEMS = [
  {
    key: 'caption_copied',
    label: 'Caption copied to clipboard',
    description: 'Copy your post caption and paste it into your social media platform',
    icon: Copy,
    color: 'text-blue-600',
  },
  {
    key: 'image_downloaded',
    label: 'Post image downloaded / saved',
    description: 'Download the generated post image(s) for upload to your platform',
    icon: Download,
    color: 'text-indigo-600',
  },
  {
    key: 'posted_to_platform',
    label: 'Posted to social platform',
    description: 'Publish the post on Facebook, Instagram, or your target platform',
    icon: Share2,
    color: 'text-green-600',
  },
  {
    key: 'boost_enabled',
    label: 'Boost / paid promotion enabled',
    description: 'Set up a paid boost or ad campaign to amplify reach (optional but recommended)',
    icon: Megaphone,
    color: 'text-orange-500',
  },
  {
    key: 'team_notified',
    label: 'Team / staff notified',
    description: 'Let your team know this campaign is live so they can engage with it',
    icon: Users,
    color: 'text-purple-600',
  },
];

export default function CampaignLaunchModal({ campaign, open, onClose, onLaunched }) {
  const existingChecklist = campaign?.launch_checklist || {};
  const [checklist, setChecklist] = useState({
    caption_copied: existingChecklist.caption_copied || false,
    image_downloaded: existingChecklist.image_downloaded || false,
    posted_to_platform: existingChecklist.posted_to_platform || false,
    boost_enabled: existingChecklist.boost_enabled || false,
    team_notified: existingChecklist.team_notified || false,
    launch_notes: existingChecklist.launch_notes || '',
  });
  const [saving, setSaving] = useState(false);

  const completedCount = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length;
  const requiredComplete = checklist.caption_copied && checklist.posted_to_platform;
  const isAlreadyLaunched = campaign?.status === 'in_progress' || campaign?.status === 'completed';

  const toggle = (key) => setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const handleLaunch = async () => {
    setSaving(true);
    try {
      await base44.entities.MarketingTask.update(campaign.id, {
        status: 'in_progress',
        launched_at: new Date().toISOString(),
        launch_checklist: checklist,
      });
      if (onLaunched) onLaunched();
      onClose();
    } catch (err) {
      alert('Failed to save launch: ' + err.message);
    }
    setSaving(false);
  };

  const handleSaveChecklist = async () => {
    setSaving(true);
    try {
      await base44.entities.MarketingTask.update(campaign.id, {
        launch_checklist: checklist,
      });
      if (onLaunched) onLaunched();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-blue-600" />
            </div>
            Campaign Launch Checklist
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Check off each step as you complete it for <strong>{campaign?.title?.replace(/\[AI-[^\]]+\]\s*/, '')}</strong>
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{completedCount} of {CHECKLIST_ITEMS.length} steps complete</span>
            <span className={completedCount === CHECKLIST_ITEMS.length ? 'text-green-600 font-semibold' : ''}>
              {Math.round((completedCount / CHECKLIST_ITEMS.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map(item => {
            const Icon = item.icon;
            const done = checklist[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  done
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-slate-300" />}
                </div>
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${done ? 'text-green-500' : item.color}`} />
                  <div>
                    <p className={`text-sm font-medium ${done ? 'text-green-700 line-through' : 'text-slate-800'}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
                {item.key === 'boost_enabled' && (
                  <Badge className="text-[10px] bg-orange-100 text-orange-600 border-orange-200 flex-shrink-0">Optional</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Launch notes */}
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Launch Notes (optional)</label>
          <Textarea
            value={checklist.launch_notes}
            onChange={e => setChecklist(prev => ({ ...prev, launch_notes: e.target.value }))}
            placeholder="e.g. Posted to Facebook at 9am, boosted for $20 targeting 25-mile radius..."
            className="text-xs h-20 resize-none"
          />
        </div>

        {/* Warning if minimum steps not done */}
        {!requiredComplete && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">At minimum, copy your caption and post to a platform before marking as launched.</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 text-sm">
            Cancel
          </Button>
          {isAlreadyLaunched ? (
            <Button onClick={handleSaveChecklist} disabled={saving} className="flex-1 bg-slate-700 hover:bg-slate-800 text-sm">
              {saving ? 'Saving...' : 'Save Progress'}
            </Button>
          ) : (
            <Button
              onClick={handleLaunch}
              disabled={saving || !requiredComplete}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
            >
              <Rocket className="w-4 h-4 mr-1.5" />
              {saving ? 'Launching...' : `Launch Campaign (${completedCount}/${CHECKLIST_ITEMS.length})`}
            </Button>
          )}
        </div>

        {campaign?.launched_at && (
          <p className="text-[10px] text-center text-slate-400">
            Launched {new Date(campaign.launched_at).toLocaleString()}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}