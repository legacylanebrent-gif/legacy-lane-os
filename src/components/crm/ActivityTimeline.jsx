import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, Calendar, FileText, MessageSquare, Home } from 'lucide-react';
import { format } from 'date-fns';

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  sms: MessageSquare,
  site_visit: Home
};

export default function ActivityTimeline({ activities }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No activities recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="relative">
            {!isLast && (
              <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-200" />
            )}
            
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gold-700" />
                </div>
              </div>

              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-navy-900">
                      {activity.subject || activity.activity_type}
                    </h4>
                    <p className="text-sm text-slate-500">
                      {activity.completed_date ? 
                        format(new Date(activity.completed_date), 'MMM d, yyyy • h:mm a') :
                        format(new Date(activity.created_date), 'MMM d, yyyy • h:mm a')
                      }
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activity.activity_type}
                  </Badge>
                </div>

                {activity.description && (
                  <p className="text-sm text-slate-600 mt-2">
                    {activity.description}
                  </p>
                )}

                {activity.outcome && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Outcome:</span> {activity.outcome}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}