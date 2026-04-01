import { useMemo, useState } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST, DIST_UNIT, RunIds } from '@/utils/utils';

const PAGE_SIZE = 3;

interface IRaceRecordsProps {
  locateActivity: (_runIds: RunIds) => void;
}

interface RaceEntry {
  runId: number;
  name: string;
  date: string;
  distance: string;
  time: string;
}

const RaceRecords = ({ locateActivity }: IRaceRecordsProps) => {
  const { activities } = useActivities();
  const [page, setPage] = useState(0);

  const races = useMemo(() => {
    const matched = activities.filter((run) => {
      const name = (run.name || '').toLowerCase();
      const isMarathonName =
        name.includes('马拉松') || name.includes('marathon');
      // distance >= 42km AND pace < 7 min/km (speed > 1000/420 ≈ 2.38 m/s)
      const isMarathonByStats =
        run.distance >= 42000 && run.average_speed > 1000 / 420;
      return isMarathonName || isMarathonByStats;
    });

    return matched
      .sort(
        (a, b) =>
          new Date(b.start_date_local).getTime() -
          new Date(a.start_date_local).getTime()
      )
      .map(
        (run): RaceEntry => ({
          runId: run.run_id,
          name: run.name,
          date: run.start_date_local.slice(0, 10),
          distance:
            (run.distance / M_TO_DIST).toFixed(1) + ' ' + DIST_UNIT,
          time: run.moving_time,
        })
      );
  }, [activities]);

  const totalPages = Math.ceil(races.length / PAGE_SIZE);
  const pagedRaces = races.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (races.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--color-activity-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold italic">马拉松记录</h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs opacity-60">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-1.5 py-0.5 disabled:opacity-30"
            >
              ‹
            </button>
            <span>{page + 1}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-1.5 py-0.5 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-hr-primary)] text-left opacity-60">
            <th className="pb-2 pr-3 font-medium">日期</th>
            <th className="pb-2 pr-3 font-medium">赛事</th>
            <th className="pb-2 pr-3 font-medium">距离</th>
            <th className="pb-2 font-medium">用时</th>
          </tr>
        </thead>
        <tbody>
          {pagedRaces.map((race) => (
            <tr
              key={race.runId}
              className="cursor-pointer border-b border-[var(--color-hr-primary)] border-opacity-30 transition-opacity hover:opacity-70"
              onClick={() => locateActivity([race.runId])}
            >
              <td className="py-2 pr-3 whitespace-nowrap">{race.date}</td>
              <td className="py-2 pr-3 font-medium">{race.name}</td>
              <td className="py-2 pr-3 whitespace-nowrap">
                {race.distance}
              </td>
              <td className="py-2 whitespace-nowrap">{race.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RaceRecords;
