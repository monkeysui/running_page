import type React from 'react';
import { Activity, M_TO_DIST, DIST_UNIT } from '@/utils/utils';
import { formatHoursShort } from '@/utils/stats';
import { convertMovingTime2Sec } from '@/utils/utils';
import { useMemo } from 'react';

const IconRoute = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M12 19h4.5a3.5 3.5 0 000-7h-8a3.5 3.5 0 010-7H12" />
  </svg>
);
const IconPin = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

interface ProfileSidebarProps {
  activities: Activity[];
  countries: string[];
  provinces: string[];
  years: string[];
}

const ProfileSidebar = ({
  activities,
  countries,
  provinces,
  years,
}: ProfileSidebarProps) => {
  const stats = useMemo(() => {
    let meters = 0;
    let seconds = 0;
    activities.forEach((r) => {
      meters += r.distance || 0;
      seconds += convertMovingTime2Sec(r.moving_time);
    });

    let latest: Activity | null = null;
    activities.forEach((r) => {
      if (!latest || r.start_date_local > latest.start_date_local) latest = r;
    });

    return {
      distance: Math.round(meters / M_TO_DIST),
      count: activities.length,
      totalSeconds: seconds,
      latest,
    };
  }, [activities]);

  const latest = stats.latest as Activity | null;
  const latestDateLabel = latest
    ? new Date(latest.start_date_local.replace(' ', 'T')).toLocaleString(
        'en-US',
        { month: 'short', day: 'numeric' }
      )
    : '';
  const latestDistance = latest ? (latest.distance / M_TO_DIST).toFixed(1) : '';

  return (
    <div className="bg-surface-card flex h-full flex-col justify-between gap-3 rounded-2xl p-5 transition-transform hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <IconRoute
            className="h-5 w-5 self-center"
            style={{ color: 'var(--color-secondary)' }}
          />
          <span className="font-headline text-3xl font-extrabold tracking-tight">
            {stats.distance.toLocaleString()}
          </span>
          <span className="text-muted text-xs">{DIST_UNIT}</span>
        </div>
        <div className="text-muted flex items-center gap-1 text-[11px]">
          <IconPin className="h-3 w-3" />
          <span>{countries.length}</span>
          <span className="opacity-40">/</span>
          <span>{provinces.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface-card-low flex flex-col items-center gap-0 rounded-lg py-1.5">
          <span className="font-headline text-sm leading-tight font-bold">
            {stats.count.toLocaleString()}
          </span>
          <span className="text-muted text-[9px] tracking-wider uppercase">
            activities
          </span>
        </div>
        <div className="bg-surface-card-low flex flex-col items-center gap-0 rounded-lg py-1.5">
          <span className="font-headline text-sm leading-tight font-bold">
            {years.length}
          </span>
          <span className="text-muted text-[9px] tracking-wider uppercase">
            years
          </span>
        </div>
        <div className="bg-surface-card-low flex flex-col items-center gap-0 rounded-lg py-1.5">
          <span className="font-headline text-sm leading-tight font-bold">
            {formatHoursShort(stats.totalSeconds)}
          </span>
          <span className="text-muted text-[9px] tracking-wider uppercase">
            time
          </span>
        </div>
      </div>

      {latest && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">Latest</span>
          <span className="truncate">
            <span className="font-medium">{latest.name || 'Run'}</span>
            <span className="text-muted">
              {' '}
              · {latestDistance} {DIST_UNIT} · {latestDateLabel}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ProfileSidebar;
