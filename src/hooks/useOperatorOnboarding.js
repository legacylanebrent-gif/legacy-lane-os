import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OPERATOR_ROLES = ['estate_sale_operator', 'operator'];
const MAX_SHOWS = 3;

export function useOperatorOnboarding(user) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;

    const role = user.primary_account_type || user.role;
    const isOperator = OPERATOR_ROLES.includes(role) || role === 'operator';
    if (!isOperator) return;

    const shownCount = user.onboarding_shown_count || 0;
    const dismissed = user.onboarding_dismissed_permanently;
    const completed = user.onboarding_completed;

    if (!dismissed && !completed && shownCount < MAX_SHOWS) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  const handleClose = async () => {
    setShowOnboarding(false);
    try {
      const currentCount = user?.onboarding_shown_count || 0;
      await base44.auth.updateMe({ onboarding_shown_count: currentCount + 1 });
    } catch (e) {
      console.error('Failed to update onboarding count:', e);
    }
  };

  const handleDismissPermanently = async () => {
    setShowOnboarding(false);
    try {
      await base44.auth.updateMe({ onboarding_dismissed_permanently: true });
    } catch (e) {
      console.error('Failed to dismiss onboarding:', e);
    }
  };

  return { showOnboarding, handleClose, handleDismissPermanently };
}