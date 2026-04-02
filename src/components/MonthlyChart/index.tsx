import { useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST, DIST_UNIT } from '@/utils/utils';

interface IMonthlyChartProps {
  year: string;
}

const MonthlyChart = ({ year }: IMonthlyChartProps) => {
  const { activities, years } = useActivities();

  // Yearly data for Total view
  const yearlyData = useMemo(() => {
    if (year !== 'Total') return [];
    return years.map((y) => {
      let distance = 0;
      activities.forEach((run) => {
        if (run.start_date_local.slice(0, 4) === y) {
          distance += run.distance;
        }
      });
      return {
        label: y,
        distance: parseFloat((distance / M_TO_DIST).toFixed(1)),
      };
    });
  }, [activities, years, year]);

  // Monthly data for single year view
  const monthlyData = useMemo(() => {
    if (year === 'Total') return [];
    const filtered = activities.filter(
      (r) => r.start_date_local.slice(0, 4) === year
    );
    const months = Array.from({ length: 12 }, (_, i) => ({
      label: `${i + 1}月`,
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

  const data = year === 'Total' ? yearlyData : monthlyData;
  const maxDistance = Math.max(...data.map((d) => d.distance), 1);
  const title =
    year === 'Total' ? `年度 ${DIST_UNIT}` : `${year} 月度 ${DIST_UNIT}`;

  return (
    <div className="flex flex-1 flex-col rounded-2xl bg-[var(--color-activity-card)] p-4">
      <h3 className="mb-3 text-sm font-medium opacity-60">{title}</h3>
      <div className="flex min-h-48 flex-1 items-end gap-1.5">
        {data.map((d) => {
          const heightPct = (d.distance / maxDistance) * 100;
          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {d.distance > 0 && (
                <span className="mb-1 text-[10px] opacity-60">
                  {d.distance.toFixed(0)}
                </span>
              )}
              <div
                className="w-full rounded-t bg-[var(--color-brand)] transition-all"
                style={{
                  height: d.distance > 0 ? `${Math.max(heightPct, 3)}%` : '0',
                }}
              />
              <span className="mt-1 text-[10px] opacity-50">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyChart;
