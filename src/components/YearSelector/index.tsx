import { useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import { formatPace } from '@/utils/utils';
import { INFO_MESSAGE } from '@/utils/const';
import { DIST_UNIT, M_TO_DIST } from '@/utils/utils';

interface IYearSelectorProps {
  year: string;
  onClick: (_year: string) => void;
}

const YEARLY_GOAL = 1000; // km
const MONTHLY_GOAL = 100; // km

const ProgressBar = ({
  current,
  goal,
  unit,
}: {
  current: number;
  goal: number;
  unit: string;
}) => {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xl font-bold italic">{current.toFixed(0)}</span>
        <span className="text-xs opacity-50">
          / {goal} {unit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-background)] opacity-80">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

const YearSelector = ({ year, onClick }: IYearSelectorProps) => {
  const { activities: runs, years } = useActivities();

  const yearsWithTotal = useMemo(() => [...years, 'Total'], [years]);

  const stats = useMemo(() => {
    const filtered =
      year === 'Total'
        ? runs
        : runs.filter((r) => r.start_date_local.slice(0, 4) === year);

    let sumDistance = 0;
    let totalMetersAvail = 0;
    let totalSecondsAvail = 0;
    let heartRate = 0;
    let heartRateNullCount = 0;
    let streak = 0;

    filtered.forEach((run) => {
      sumDistance += run.distance || 0;
      if (run.average_speed) {
        totalMetersAvail += run.distance || 0;
        totalSecondsAvail += (run.distance || 0) / run.average_speed;
      }
      if (run.average_heartrate) {
        heartRate += run.average_heartrate;
      } else {
        heartRateNullCount++;
      }
      if (run.streak) {
        streak = Math.max(streak, run.streak);
      }
    });

    // Monthly distance for current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthDistance = 0;
    runs.forEach((run) => {
      if (run.start_date_local.slice(0, 7) === currentMonth) {
        monthDistance += run.distance || 0;
      }
    });

    // Yearly distance for display year
    const displayYear = year === 'Total' ? String(now.getFullYear()) : year;
    let yearDistance = 0;
    runs.forEach((run) => {
      if (run.start_date_local.slice(0, 4) === displayYear) {
        yearDistance += run.distance || 0;
      }
    });

    return {
      count: filtered.length,
      distance: parseFloat((sumDistance / M_TO_DIST).toFixed(1)),
      pace: formatPace(totalMetersAvail / totalSecondsAvail),
      streak,
      heartRate:
        heartRate > 0
          ? (heartRate / (filtered.length - heartRateNullCount)).toFixed(0)
          : null,
      yearDistanceKm: parseFloat((yearDistance / M_TO_DIST).toFixed(1)),
      monthDistanceKm: parseFloat((monthDistance / M_TO_DIST).toFixed(1)),
      displayYear,
    };
  }, [runs, year]);

  const infoMessage = useMemo(
    () => INFO_MESSAGE(years.length, year),
    [years.length, year]
  );

  return (
    <div className="w-full">
      {/* Info message */}
      <p className="mb-4 text-sm opacity-70">{infoMessage}</p>

      {/* Year pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {yearsWithTotal.map((y) => (
          <button
            key={y}
            onClick={() => onClick(y)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              y === year
                ? 'bg-[var(--color-brand)] text-white'
                : 'bg-[var(--color-activity-card)] opacity-70 hover:opacity-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Compact stats */}
      <div className="grid grid-cols-3 gap-x-6 gap-y-2 sm:grid-cols-5">
        <div>
          <div className="text-xl font-bold italic">{stats.count}</div>
          <div className="text-xs opacity-60">Runs</div>
        </div>
        <div>
          <div className="text-xl font-bold italic">{stats.distance}</div>
          <div className="text-xs opacity-60">{DIST_UNIT}</div>
        </div>
        <div>
          <div className="text-xl font-bold italic">{stats.pace}</div>
          <div className="text-xs opacity-60">Avg Pace</div>
        </div>
        <div>
          <div className="text-xl font-bold italic">
            {stats.streak}
            <span className="text-xs font-normal"> day</span>
          </div>
          <div className="text-xs opacity-60">Streak</div>
        </div>
        {stats.heartRate && (
          <div>
            <div className="text-xl font-bold italic">{stats.heartRate}</div>
            <div className="text-xs opacity-60">Avg HR</div>
          </div>
        )}
      </div>
    </div>
  );
};

export { ProgressBar, YEARLY_GOAL, MONTHLY_GOAL };
export default YearSelector;
