import type React from 'react';
import { PersonalBests, formatHms } from '@/utils/stats';

const IconTrophy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M6 3h12v2a6 6 0 01-4 5.66V14h3a1 1 0 011 1v1H8v-1a1 1 0 011-1h3v-3.34A6 6 0 016 5V3z" />
    <path d="M9 19h6v2H9z" />
  </svg>
);

interface PersonalBestProps {
  bests: PersonalBests;
}

const ROWS: Array<{ key: keyof PersonalBests; label: string }> = [
  { key: 'fiveK', label: '5K' },
  { key: 'tenK', label: '10K' },
  { key: 'half', label: 'Half Marathon' },
  { key: 'full', label: 'Marathon' },
];

const PersonalBest = ({ bests }: PersonalBestProps) => {
  return (
    <div className="bg-surface-card flex flex-col gap-4 rounded-2xl p-6 transition-transform hover:scale-[1.02]">
      <div className="flex items-center gap-2">
        <IconTrophy
          className="h-4 w-4"
          style={{ color: 'var(--color-secondary)' }}
        />
        <h3 className="font-headline text-base font-bold">Personal Best</h3>
      </div>
      <div className="flex flex-col divide-y divide-white/5">
        {ROWS.map(({ key, label }) => {
          const value = bests[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="text-muted">{label}</span>
              <span
                className="font-headline font-bold tabular-nums"
                style={{
                  color:
                    value !== null
                      ? 'var(--color-secondary)'
                      : 'var(--color-on-surface-variant)',
                }}
              >
                {formatHms(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalBest;
