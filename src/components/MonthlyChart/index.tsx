import { useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST, DIST_UNIT } from '@/utils/utils';

interface IMonthlyChartProps {
  year: string;
}

const MonthlyChart = ({ year }: IMonthlyChartProps) => {
  const { activities } = useActivities();

  const monthlyData = useMemo(() => {
    const filtered =
      year === 'Total'
        ? activities
        : activities.filter((r) => r.start_date_local.slice(0, 4) === year);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      distance: 0,
    }));

    filtered.forEach((run) => {
      const m = parseInt(run.start_date_local.slice(5, 7), 10);
      if (m >= 1 && m <= 12) {
        months[m - 1].distance += run.distance;
      }
    });

    months.forEach((m) => {
      m.distance = parseFloat((m.distance / M_TO_DIST).toFixed(1));
    });

    return months;
  }, [activities, year]);

  const maxDistance = useMemo(
    () => Math.max(...monthlyData.map((m) => m.distance), 1),
    [monthlyData]
  );

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-[var(--color-activity-card)] p-4">
      <h3 className="mb-3 text-sm font-medium opacity-60">
        {year === 'Total' ? '全部' : year} 月度 {DIST_UNIT}
      </h3>
      <div className="flex min-h-48 flex-1 items-end gap-1.5">
        {monthlyData.map((m) => {
          // Use sqrt scale for better visual distribution
          const ratio = m.distance / maxDistance;
          const heightPct = Math.sqrt(ratio) * 100;
          return (
            <div
              key={m.month}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {m.distance > 0 && (
                <span className="mb-1 text-[10px] opacity-60">
                  {m.distance.toFixed(0)}
                </span>
              )}
              <div
                className="w-full rounded-t bg-[var(--color-brand)] transition-all"
                style={{
                  height: m.distance > 0 ? `${Math.max(heightPct, 5)}%` : '0',
                }}
              />
              <span className="mt-1 text-[10px] opacity-50">{m.month}月</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyChart;
