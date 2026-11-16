import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// How many automatic launches a user gets before the tour becomes button-only.
const MAX_AUTO_SHOWS = 3;
const LS_COUNT = 'usageTourShownCount';
const LS_DISMISSED = 'usageTourDismissed';

function readNumber(key, fallback = 0) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function useUsageTour(user) {
  const [show, setShow] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const openedAutomatically = useRef(false);

  // Auto-launch for the first few visits of an operator / paid account.
  useEffect(() => {
    if (!user?.id || autoShown) return;

    // Wait until the account setup is finished — the legacy setup modal must not
    // stack on top of the tour. The button is always available meanwhile.
    if (!user.onboarding_completed) return;

    const dismissed = !!user.usage_tour_dismissed || readFlag(LS_DISMISSED);
    if (dismissed) return;

    const count = Math.max(readNumber(LS_COUNT), Number(user.usage_tour_shown_count) || 0);
    if (count >= MAX_AUTO_SHOWS) return;

    const timer = setTimeout(() => {
      openedAutomatically.current = true;
      setAutoShown(true);
      setShow(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [user?.id, user?.onboarding_completed, user?.usage_tour_dismissed, user?.usage_tour_shown_count, autoShown]);

  const persistCount = useCallback(async (next) => {
    try {
      localStorage.setItem(LS_COUNT, String(next));
    } catch {
      // private mode — the user record still tracks it
    }
    try {
      await base44.auth.updateMe({ usage_tour_shown_count: next });
    } catch (e) {
      console.error('Failed to save tour launch count:', e);
    }
  }, []);

  const open = useCallback(() => {
    openedAutomatically.current = false;
    setShow(true);
  }, []);

  const close = useCallback(async () => {
    setShow(false);
    if (!openedAutomatically.current) return;
    openedAutomatically.current = false;

    const count = Math.max(readNumber(LS_COUNT), Number(user?.usage_tour_shown_count) || 0);
    if (count < MAX_AUTO_SHOWS) await persistCount(count + 1);
  }, [user?.usage_tour_shown_count, persistCount]);

  // "Don't open this automatically again" — the tour stays available from the button.
  const dismissAuto = useCallback(async () => {
    try {
      localStorage.setItem(LS_DISMISSED, '1');
    } catch {
      // ignore
    }
    try {
      await base44.auth.updateMe({ usage_tour_dismissed: true });
    } catch (e) {
      console.error('Failed to dismiss automatic tour:', e);
    }
  }, []);

  return { show, open, close, dismissAuto };
}

export default useUsageTour;