import { useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST } from '@/utils/utils';
import {
  ACTIVITY_TYPE_COLORS,
  DASHBOARD_ACTIVITY_TYPES,
  normalizeDashboardActivityType,
} from '@/utils/activityTypes';

interface IMonthlyChartProps {
  year: string;
}

const MonthlyChart = ({ year }: IMonthlyChartProps) => {
  const { activities, years } = useActivities();

  const data = useMemo(() => {
    const labels =
      year === 'Total'
        ? years
        : [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
    const rows = labels.map((label) => ({
      label,
      Run: 0,
      Ride: 0,
      Hike: 0,
      Swim: 0,
      distance: 0,
    }));

    activities.forEach((activity) => {
      const type = normalizeDashboardActivityType(activity.type);
      if (!type) return;
      const activityYear = activity.start_date_local.slice(0, 4);
      const index =
        year === 'Total'
          ? labels.indexOf(activityYear)
          : activityYear === year
            ? parseInt(activity.start_date_local.slice(5, 7), 10) - 1
            : -1;
      if (index < 0 || index >= rows.length) return;
      const distance = activity.distance || 0;
      rows[index][type] += distance;
      rows[index].distance += distance;
    });

    return rows.map((row) => ({
      ...row,
      Run: row.Run / M_TO_DIST,
      Ride: row.Ride / M_TO_DIST,
      Hike: row.Hike / M_TO_DIST,
      Swim: row.Swim / M_TO_DIST,
      distance: row.distance / M_TO_DIST,
    }));
  }, [activities, year, years]);

  const maxDistance = Math.max(...data.map((d) => d.distance), 1);

  return (
    <div className="flex min-h-[200px] flex-1 flex-col">
      <div className="flex flex-1 items-end gap-2">
        {data.map((d) => {
          const heightPct = (d.distance / maxDistance) * 100;
          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {d.distance > 0 && (
                <span className="mb-1 text-[10px] font-semibold opacity-70">
                  {d.distance.toFixed(0)}
                </span>
              )}
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-md transition-all hover:opacity-100"
                style={{
                  height: d.distance > 0 ? `${Math.max(heightPct, 3)}%` : '2px',
                  backgroundColor: 'var(--color-surface-variant)',
                }}
                title={DASHBOARD_ACTIVITY_TYPES.filter((type) => d[type] > 0)
                  .map((type) => `${type}: ${d[type].toFixed(1)} km`)
                  .join(' · ')}
              >
                {DASHBOARD_ACTIVITY_TYPES.map((type) => (
                  <div
                    key={type}
                    style={{
                      height:
                        d.distance > 0 ? `${(d[type] / d.distance) * 100}%` : 0,
                      backgroundColor: ACTIVITY_TYPE_COLORS[type],
                    }}
                  />
                ))}
              </div>
              <span className="text-muted mt-2 text-[10px] font-bold tracking-wider uppercase">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyChart;
