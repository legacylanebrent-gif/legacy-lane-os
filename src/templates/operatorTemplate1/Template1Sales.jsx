// Template #1 sales page (Part 26 + Phase 4C Part 5) — renders ONLY
// publication-visible canonical sales from the runtime, intelligently
// grouped: Upcoming, Current, Recently Completed. Internal draft and
// archived/cancelled sales never render. Empty state stays professional.
import React from 'react';
import SaleCard, { formatSaleDates } from './SaleCard.jsx';
import TemplateErrorState from './TemplateErrorState.jsx';
import { CalendarClock, Flame, History } from 'lucide-react';

function groupSales(sales) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const groups = { upcoming: [], current: [], completed: [] };
  for (const s of sales) {
    if (!s || !s.public_id) continue;
    if (s.status === 'draft' || s.status === 'archived') continue; // never render internal/cancelled
    const dates = Array.isArray(s.sale_dates) ? s.sale_dates.filter(d => d && d.date) : [];
    const lastDate = dates.length ? new Date(`${dates[dates.length - 1].date}T23:59:59`) : null;
    if (s.status === 'completed' || (lastDate && lastDate < today && s.status !== 'upcoming' && s.status !== 'active')) {
      // Recently completed only — a bounded historical archive (Part 35).
      const ageDays = lastDate ? (today - lastDate) / 86400000 : 0;
      if (s.status === 'completed' && ageDays <= 120) groups.completed.push(s);
      continue;
    }
    const firstDate = dates.length ? new Date(`${dates[0].date}T00:00:00`) : null;
    if (s.status === 'active' || (firstDate && firstDate <= today)) groups.current.push(s);
    else groups.upcoming.push(s);
  }
  return groups;
}

function Section({ icon: Icon, title, sales, hostname, completed = false }) {
  if (sales.length === 0) return null;
  return (
    <section aria-labelledby={`t1-sales-${title.replace(/\s/g, '-')}`}>
      <h2 id={`t1-sales-${title.replace(/\s/g, '-')}`} className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color: 'var(--t1-primary)' }} aria-hidden="true" /> {title}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sales.map(s => <SaleCard key={s.public_id} sale={s} hostname={hostname} showFeaturedBadge={!completed} />)}
      </div>
    </section>
  );
}

export default function Template1Sales({ website }) {
  const groups = groupSales(website.published_sales || []);
  const hasAny = groups.upcoming.length + groups.current.length + groups.completed.length > 0;
  if (!hasAny) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Estate Sales</h1>
        <TemplateErrorState kind="no_sales" />
      </div>
    );
  }
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Estate Sales</h1>
      <Section icon={CalendarClock} title="Upcoming Sales" sales={groups.upcoming} hostname={website.hostname} />
      <Section icon={Flame} title="Current Sales" sales={groups.current} hostname={website.hostname} />
      <Section icon={History} title="Recently Completed" sales={groups.completed} hostname={website.hostname} completed />
    </div>
  );
}