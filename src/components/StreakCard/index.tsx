import type React from 'react';
import { StreakInfo } from '@/utils/stats';

const IconFlame = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2c.5 3 2 4 3.5 5.5C17.5 9.5 19 12 19 14.5c0 4-3.13 7.5-7 7.5s-7-3.5-7-7.5c0-2 1-3.5 2.5-5 .5-.5 1-1 1.5-1.5 0 1 .5 2 1.5 2.5C9.5 9 9 7 10 5c1-2 1.5-2.5 2-3z" />
  </svg>
);
const IconSparkle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2l1.5 5L19 8l-5.5 1L12 14l-1.5-5L5 8l5.5-1L12 2zM18 14l.8 2.4L21 17l-2.2.6L18 20l-.8-2.4L15 17l2.2-.6L18 14z" />
  </svg>
);

interface StreakCardProps {
  info: StreakInfo;
}

const DOW_LABEL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const StreakCard = ({ info }: StreakCardProps) => {
  const { current, longest, longestWeeks, recentDays } = info;

  return (
    <div className="bg-surface-card flex h-full flex-col gap-4 rounded-2xl p-5 transition-transform hover:scale-[1.02]">
      <div className="flex items-center gap-2">
        <IconFlame
          className="h-3.5 w-3.5"
          style={{ color: 'var(--color-accent-red)' }}
        />
        <span className="text-muted text-[10px] font-semibold tracking-widest uppercase">
          Streak
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-headline text-3xl font-extrabold tracking-tight">
          {current}
        </span>
        <span className="text-muted text-base">days</span>
      </div>

      <div className="flex w-full items-end justify-between gap-1">
        {recentDays.map((d) => {
          const dow = (d.date.getDay() + 6) % 7;
          const label = DOW_LABEL[dow];
          const dateLabel = d.date.getDate();
          return (
            <div
              key={d.date.toISOString()}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-muted text-[9px] font-semibold uppercase">
                {label}
              </span>
              <div
                className={`flex aspect-square w-full max-w-[28px] items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  d.active
                    ? 'text-black'
                    : 'text-[var(--color-on-surface-variant)]'
                }`}
                style={{
                  backgroundColor: d.active
                    ? 'var(--color-accent-red)'
                    : 'var(--color-surface-variant)',
                  border: d.isToday ? '1.5px solid var(--color-brand)' : 'none',
                }}
              >
                {dateLabel}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="flex items-center gap-1 text-[11px] font-medium"
        style={{ color: 'var(--color-secondary)' }}
      >
        <IconSparkle className="h-3 w-3" />
        <span>
          Longest: {longest} days / {longestWeeks} weeks
        </span>
      </div>
    </div>
  );
};

export default StreakCard;
