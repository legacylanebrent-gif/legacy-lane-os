import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Days left in the user's free trial, read from their trial Subscription record
 * (renewal_date is the trial end). Returns null when the user is not on a trial
 * or no trial date is recorded.
 */
export default function useTrialStatus(user) {
  const [daysLeft, setDaysLeft] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.id || user.subscription_status !== 'trial') {
        if (!cancelled) setDaysLeft(null);
        return;
      }
      try {
        const page = await base44.entities.Subscription.filter(
          { user_id: user.id },
          { sort: '-created_date', limit: 5 }
        );
        const subs = Array.isArray(page) ? page : page?.items || [];
        const trial = subs.find((s) => s.renewal_date);
        if (cancelled) return;
        setDaysLeft(
          trial ? Math.ceil((new Date(trial.renewal_date).getTime() - Date.now()) / 86400000) : null
        );
      } catch (error) {
        console.error('Trial status:', error);
        if (!cancelled) setDaysLeft(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.subscription_status]);

  return daysLeft;
}