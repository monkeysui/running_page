import type React from 'react';
import { Activity, M_TO_DIST, DIST_UNIT, locationForRun } from '@/utils/utils';
import { formatHoursShort } from '@/utils/stats';
import { convertMovingTime2Sec } from '@/utils/utils';
import { useMemo, useState } from 'react';
import { useInterval } from '@/hooks/useInterval';
import {
  ACTIVITY_TYPE_COLORS,
  DASHBOARD_ACTIVITY_TYPES,
  DashboardActivityType,
  normalizeDashboardActivityType,
} from '@/utils/activityTypes';

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
}

const OVERVIEW_CAROUSEL_INTERVAL_MS = 6000;

const ProfileSidebar = ({ activities }: ProfileSidebarProps) => {
  const [activityType, setActivityType] =
    useState<DashboardActivityType>('Run');
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);

  useInterval(
    () => {
      setActivityType((currentType) => {
        const currentIndex = DASHBOARD_ACTIVITY_TYPES.indexOf(currentType);
        const nextIndex = (currentIndex + 1) % DASHBOARD_ACTIVITY_TYPES.length;
        return DASHBOARD_ACTIVITY_TYPES[nextIndex];
      });
    },
    isCarouselPaused ? null : OVERVIEW_CAROUSEL_INTERVAL_MS
  );

  const stats = useMemo(() => {
    let meters = 0;
    let seconds = 0;
    const countries = new Set<string>();
    const provinces = new Set<string>();
    const years = new Set<string>();
    const selectedActivities = activities.filter(
      (activity) =>
        normalizeDashboardActivityType(activity.type) === activityType
    );

    selectedActivities.forEach((r) => {
      meters += r.distance || 0;
      seconds += convertMovingTime2Sec(r.moving_time);
      const location = locationForRun(r);
      if (location.country) countries.add(location.country);
      if (location.province) provinces.add(location.province);
      years.add(r.start_date_local.slice(0, 4));
    });

    let latest: Activity | null = null;
    selectedActivities.forEach((r) => {
      if (!latest || r.start_date_local > latest.start_date_local) latest = r;
    });

    return {
      distance: Math.round(meters / M_TO_DIST),
      count: selectedActivities.length,
      totalSeconds: seconds,
      latest,
      countryCount: countries.size,
      provinceCount: provinces.size,
      yearCount: years.size,
    };
  }, [activities, activityType]);

  const latest = stats.latest as Activity | null;
  const latestDateLabel = latest
    ? new Date(latest.start_date_local.replace(' ', 'T')).toLocaleString(
        'en-US',
        { month: 'short', day: 'numeric' }
      )
    : '';
  const latestDistance = latest ? (latest.distance / M_TO_DIST).toFixed(1) : '';
  const accentColor = ACTIVITY_TYPE_COLORS[activityType];

  return (
    <div
      className="bg-surface-card flex h-full gap-3 rounded-2xl p-5 transition-transform hover:scale-[1.02]"
      onMouseEnter={() => setIsCarouselPaused(true)}
      onMouseLeave={() => setIsCarouselPaused(false)}
      onFocus={() => setIsCarouselPaused(true)}
      onBlur={() => setIsCarouselPaused(false)}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <IconRoute
              className="h-5 w-5 shrink-0 self-center"
              style={{ color: accentColor }}
            />
            <span className="font-headline text-3xl font-extrabold tracking-tight">
              {stats.distance.toLocaleString()}
            </span>
            <span className="text-muted text-xs">{DIST_UNIT}</span>
          </div>
          <div className="text-muted flex shrink-0 items-center gap-1 text-[11px]">
            <IconPin className="h-3 w-3" />
            <span>{stats.countryCount}</span>
            <span className="opacity-40">/</span>
            <span>{stats.provinceCount}</span>
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
              {stats.yearCount}
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

        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-muted">Latest</span>
          {latest ? (
            <span className="truncate">
              <span className="font-medium">
                {latest.name ||
                  normalizeDashboardActivityType(latest.type) ||
                  latest.type}
              </span>
              <span className="text-muted">
                {' '}
                · {latestDistance} {DIST_UNIT} · {latestDateLabel}
              </span>
            </span>
          ) : (
            <span className="text-muted">No activities yet</span>
          )}
        </div>
      </div>

      <div className="flex w-14 shrink-0 flex-col justify-between gap-1 border-l border-white/5 pl-2">
        {DASHBOARD_ACTIVITY_TYPES.map((type) => {
          const selected = type === activityType;
          const color = ACTIVITY_TYPE_COLORS[type];
          return (
            <button
              key={type}
              type="button"
              aria-pressed={selected}
              onClick={() => setActivityType(type)}
              className="w-full flex-1 rounded-lg px-1 py-1 text-[10px] font-semibold transition-colors"
              style={{
                backgroundColor: selected
                  ? `color-mix(in srgb, ${color} 18%, transparent)`
                  : 'transparent',
                color: selected ? color : 'var(--color-on-surface-variant)',
                border: `1px solid ${
                  selected
                    ? `color-mix(in srgb, ${color} 50%, transparent)`
                    : 'transparent'
                }`,
              }}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileSidebar;
