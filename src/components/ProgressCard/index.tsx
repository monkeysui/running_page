import type React from 'react';
import { PeriodComparison, formatHoursShort } from '@/utils/stats';
import { DIST_UNIT } from '@/utils/utils';

const IconCalendarYear = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const IconCalendarMonth = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M7 13h2v2H7zM11 13h2v2h-2zM15 13h2v2h-2z" />
  </svg>
);
const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
const IconBolt = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);
const IconArrowUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);
const IconArrowDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 7l10 10M15 17h-8v-8" />
  </svg>
);

const PERIOD_ICON = {
  year: IconCalendarYear,
  month: IconCalendarMonth,
  week: IconClock,
} as const;

interface ProgressCardProps {
  label: string; // "YEARLY GOAL"
  period: 'year' | 'month' | 'week';
  goalKm: number;
  comparison: PeriodComparison;
}

const ProgressCard = ({
  label,
  period,
  goalKm,
  comparison,
}: ProgressCardProps) => {
  const Icon = PERIOD_ICON[period];
  const { current, deltaKm, previousLabel } = comparison;
  const curKm = current.distanceKm;
  const pct = Math.min((curKm / goalKm) * 100, 100);
  const deltaPositive = deltaKm >= 0;
  const deltaColor = deltaPositive
    ? 'var(--color-brand)'
    : 'var(--color-accent-red)';
  const DeltaIcon = deltaPositive ? IconArrowUp : IconArrowDown;

  return (
    <div className="bg-surface-card flex h-full flex-col gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.02]">
      <div className="flex items-center gap-2">
        <Icon className="text-muted h-3.5 w-3.5" />
        <span className="text-muted text-[10px] font-semibold tracking-widest uppercase">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-headline text-3xl font-extrabold tracking-tight">
          {curKm.toFixed(curKm >= 100 ? 0 : 1)}
        </span>
        <span className="text-muted text-base">/ {goalKm}</span>
        <span className="text-muted ml-auto text-xs">{DIST_UNIT}</span>
      </div>

      <div className="bg-surface-variant h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--color-brand), var(--color-secondary))',
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <IconBolt className="h-3 w-3" style={{ color: 'var(--color-brand)' }} />
        <span className="text-muted">{current.count} activities</span>
        <span className="text-muted ml-auto">
          {formatHoursShort(current.totalSeconds)}
        </span>
      </div>

      <div
        className="flex items-center gap-1 text-[11px] font-medium"
        style={{ color: deltaColor }}
      >
        <DeltaIcon className="h-3 w-3" />
        <span>
          {deltaPositive ? '+' : ''}
          {deltaKm.toFixed(0)} {DIST_UNIT} vs {previousLabel}
        </span>
      </div>
    </div>
  );
};

export default ProgressCard;
