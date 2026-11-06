import React, { useEffect, useRef } from 'react';
import { FileText, Camera, MessagesSquare, Clock, ClipboardList, KeyRound, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Single source of truth for the sale editor sections. Used by the tab bar and by
// the first-visit walkthrough so the tour always matches the real tabs.
export const SALE_EDITOR_TABS = [
  {
    value: 'info',
    label: 'Sale Info',
    caption: 'Title, address, dates',
    icon: FileText,
    tour: 'Start here. Add the sale title, type, status, property address and sale dates. Everything you type saves automatically as you go.',
  },
  {
    value: 'images',
    label: 'Images',
    caption: 'Photos & AI pricing',
    icon: Camera,
    tour: 'Add your photos, then let AI name each item, write a description and suggest a price. Work top-down: flag the photos to skip, quick scan, then deep search.',
  },
  {
    value: 'communications',
    label: 'Communications',
    caption: 'Client contact log',
    icon: MessagesSquare,
    tour: 'Log every call, text and email with the client here, so the whole team can see the history for this sale.',
  },
  {
    value: 'labor',
    label: 'Labor',
    caption: 'Hours & payroll',
    icon: Clock,
    tour: 'Track hours worked on this sale, by person, while the preparation and sale days are happening.',
  },
  {
    value: 'assessment',
    label: 'Operational Site Assessment',
    caption: 'Stairs, parking, volume',
    icon: ClipboardList,
    tour: 'Answer a few practical questions about the house: stairs, parking, loading access, how much merchandise. This shapes your pricing and staffing.',
  },
  {
    value: 'access',
    label: 'Property Access Plan',
    caption: 'Keys & access windows',
    icon: KeyRound,
    tour: 'Your private plan for getting in: key method, alarm notes, pets, restricted rooms and the hours the team is allowed on site. Only you and admins see this.',
  },
  {
    value: 'postsale',
    label: 'Post Sale',
    caption: 'Wrap-up after the sale',
    icon: PackageCheck,
    tour: 'When the sale is over, come back here to wrap things up: leftover merchandise, pack-up event and the final post-sale actions.',
  },
];

export default function SaleEditorTabs({ value, onValueChange, highlightValue, raised, className }) {
  const listRef = useRef(null);

  // Keep the highlighted tab in view while the walkthrough runs.
  useEffect(() => {
    if (highlightValue && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightValue]);

  return (
    <div
      ref={listRef}
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-2 rounded-2xl bg-slate-100 ring-1 ring-slate-200',
        raised && 'relative z-[45] shadow-xl',
        className
      )}
    >
      {SALE_EDITOR_TABS.map((tab, index) => {
        const Icon = tab.icon;
        const active = value === tab.value;
        const highlighted = highlightValue === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onValueChange(tab.value)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'group relative flex flex-col gap-1 rounded-xl border px-2.5 py-2 text-left transition-all duration-200',
              active
                ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-700 hover:shadow-md',
              highlighted && 'ring-4 ring-orange-400 ring-offset-2 animate-pulse'
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0',
                  active ? 'bg-white text-orange-700' : 'bg-orange-100 text-orange-700'
                )}
              >
                {index + 1}
              </span>
              <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', active ? 'text-white' : 'text-orange-500')} />
            </span>
            <span className="text-[11px] font-bold leading-tight">{tab.label}</span>
            <span className={cn('text-[10px] leading-tight', active ? 'text-orange-50' : 'text-slate-400')}>
              {tab.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}