import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isBefore } from 'date-fns';

function getDayTimes(d) {
  if (!d.date) return null;
  const [y, m, day] = d.date.split('-').map(Number);
  const startParts = (d.start_time || '00:00').split(':').map(Number);
  const endParts = (d.end_time || '23:59').split(':').map(Number);
  return {
    start: new Date(y, m - 1, day, ...startParts),
    end: new Date(y, m - 1, day, ...endParts),
  };
}

function isInProgress(d, now) {
  const times = getDayTimes(d);
  if (!times) return false;
  return now >= times.start && now <= times.end;
}

function getAvailableSaleDays(saleDates) {
  if (!saleDates?.length) return [];
  const now = new Date();
  const sorted = [...saleDates].sort((a, b) => a.date.localeCompare(b.date));

  // Filter out days that are currently in progress (between start and end time)
  return sorted.filter(d => {
    if (!d.date) return false;
    const times = getDayTimes(d);
    if (!times) return false;
    // Day hasn't started yet → available
    if (now < times.start) return true;
    // Day is in progress → NOT available
    if (now <= times.end) return false;
    // Day has ended → available ONLY if there's a future day after this one
    const hasFutureDay = sorted.some(fd => {
      if (!fd.date || fd.date <= d.date) return false;
      const ft = getDayTimes(fd);
      return ft && now < ft.end;
    });
    return hasFutureDay;
  });
}

export default function SignTheListButton({ saleId, saleTitle, saleDates, user, onSuccess, earlySignInEnabled = true }) {
  const [signing, setSigning] = useState(false);
  const [checking, setChecking] = useState(true);
  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [mySignUps, setMySignUps] = useState([]);

  useEffect(() => {
    if (!user || !saleId) { setChecking(false); return; }

    const load = async () => {
      const days = getAvailableSaleDays(saleDates || []);
      setAvailableDays(days);
      if (days.length > 0) setSelectedDate(days[0].date);

      const existing = await base44.entities.EarlySignIn.filter({ sale_id: saleId, user_email: user.email });
      if (existing.length > 0) {
        setMySignUps(existing);
      }
      setChecking(false);
    };
    load();
  }, [user, saleId]);

  const getPositionForDate = async (date, userEmail) => {
    const all = await base44.entities.EarlySignIn.filter({ sale_id: saleId, sale_date: date }, 'signed_at', 500);
    const idx = all.findIndex(s => s.user_email === userEmail);
    return idx !== -1 ? idx + 1 : null;
  };

  const refreshPositions = async () => {
    const existing = await base44.entities.EarlySignIn.filter({ sale_id: saleId, user_email: user.email });
    setMySignUps(existing);
  };

  const handleSignList = async (date) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    const dayToSign = date || (availableDays[0]?.date);
    if (!dayToSign) return;

    setSigning(true);
    try {
      const alreadySigned = mySignUps.some(s => s.sale_date === dayToSign);
      if (alreadySigned) {
        await refreshPositions();
        return;
      }

      await base44.entities.EarlySignIn.create({
        sale_id: saleId,
        sale_title: saleTitle,
        sale_date: dayToSign,
        user_email: user.email,
        user_name: user.full_name || user.email,
        signed_at: new Date().toISOString(),
      });

      await refreshPositions();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error signing list:', error);
    } finally {
      setSigning(false);
    }
  };

  if (!earlySignInEnabled) {
    return (
      <Button disabled className="w-full bg-red-600 gap-2 cursor-not-allowed opacity-90">
        <ClipboardList className="w-4 h-4" />
        Sorry, No Early Sign In Allowed
      </Button>
    );
  }

  if (checking) {
    return (
      <Button disabled className="w-full bg-cyan-600 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (availableDays.length === 0) {
    const now = new Date();
    const activeDay = (saleDates || []).find(d => isInProgress(d, now));
    const msg = activeDay
      ? `Sale In Progress — Check Back After ${format(activeDay.end_time ? new Date(activeDay.date + 'T' + activeDay.end_time) : new Date(), 'h:mm a')}`
      : 'Sign-in List Closed';
    return (
      <Button disabled className="w-full bg-slate-400 gap-2 cursor-not-allowed">
        <ClipboardList className="w-4 h-4" />
        {msg}
      </Button>
    );
  }

  const isSignedForDay = (date) => mySignUps.some(s => s.sale_date === date);
  const allDaysSigned = availableDays.every(d => isSignedForDay(d.date));
  const signedDays = availableDays.filter(d => isSignedForDay(d.date));

  if (allDaysSigned && signedDays.length > 0) {
    return (
      <div className="space-y-2">
        <Button disabled className="w-full bg-green-600 hover:bg-green-700 gap-2">
          <CheckCircle2 className="w-4 h-4" />
          You're Signed Up
        </Button>
        <div className="space-y-1">
          {signedDays.map(d => (
            <SignedDayBadge key={d.date} date={d.date} saleId={saleId} userEmail={user.email} />
          ))}
        </div>
      </div>
    );
  }

  if (availableDays.length === 1) {
    const day = availableDays[0];
    const alreadySigned = isSignedForDay(day.date);
    const dateLabel = format(new Date(day.date + 'T00:00:00'), 'EEE, MMM d');
    return alreadySigned ? (
      <div className="space-y-2">
        <Button disabled className="w-full bg-green-600 gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Signed Up for {dateLabel}
        </Button>
        <SignedDayBadge date={day.date} saleId={saleId} userEmail={user.email} />
      </div>
    ) : (
      <Button
        onClick={() => handleSignList(day.date)}
        disabled={signing}
        className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2"
      >
        {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
        {signing ? 'Signing...' : `Sign the List — ${dateLabel}`}
      </Button>
    );
  }

  // Multiple days — show dropdown
  const unsignedDays = availableDays.filter(d => !isSignedForDay(d.date));
  const firstUnsignedDate = unsignedDays[0]?.date;
  const firstUnsignedLabel = firstUnsignedDate
    ? format(new Date(firstUnsignedDate + 'T00:00:00'), 'EEE, MMM d')
    : '';

  return (
    <div className="space-y-2">
      {signedDays.length > 0 && signedDays.map(d => (
        <SignedDayBadge key={d.date} date={d.date} saleId={saleId} userEmail={user.email} />
      ))}
      {unsignedDays.length > 0 && (
        <div className="flex gap-0">
          <Button
            onClick={() => handleSignList(firstUnsignedDate)}
            disabled={signing}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 gap-2 rounded-r-none border-r border-cyan-500"
          >
            {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
            {signing ? 'Signing...' : `Sign for ${firstUnsignedLabel}`}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-cyan-600 hover:bg-cyan-700 px-2 rounded-l-none border-l border-cyan-500">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {unsignedDays.map(d => {
                const label = format(new Date(d.date + 'T00:00:00'), 'EEE, MMM d');
                return (
                  <DropdownMenuItem key={d.date} onClick={() => handleSignList(d.date)}>
                    {label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function SignedDayBadge({ date, saleId, userEmail }) {
  const [position, setPosition] = useState(null);
  useEffect(() => {
    base44.entities.EarlySignIn.filter({ sale_id: saleId, sale_date: date }, 'signed_at', 500)
      .then(all => {
        const idx = all.findIndex(s => s.user_email === userEmail);
        if (idx !== -1) setPosition(idx + 1);
      });
  }, [date, saleId, userEmail]);
  const label = format(new Date(date + 'T00:00:00'), 'EEE, MMM d');
  return (
    <p className="text-center text-sm font-semibold text-green-700">
      {label}: #{position ?? '—'}
    </p>
  );
}