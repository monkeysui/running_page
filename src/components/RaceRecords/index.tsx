import { useMemo, useState } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST, DIST_UNIT, RunIds, locationForRun } from '@/utils/utils';
import raceMetadata, { raceExcludeIds } from '@/static/race-links';

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
  blogUrl?: string;
}

const RaceRecords = ({ locateActivity }: IRaceRecordsProps) => {
  const { activities } = useActivities();
  const [page, setPage] = useState(0);

  const races = useMemo(() => {
    const matched = activities.filter((run) => {
      if (raceExcludeIds.has(run.run_id)) return false;
      const name = (run.name || '').toLowerCase();
      const isMarathonName =
        name.includes('马拉松') || name.includes('marathon');
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
      .map((run): RaceEntry => {
        const meta = raceMetadata[run.run_id];
        let displayName: string;

        if (meta?.name) {
          displayName = meta.name;
        } else {
          const year = run.start_date_local.slice(0, 4);
          const { city } = locationForRun(run);
          const cleanCity = city ? city.replace(/市$/, '') : '';
          displayName = cleanCity
            ? `${year}${cleanCity}马拉松`
            : run.name || `${year}马拉松`;
        }

        return {
          runId: run.run_id,
          name: displayName,
          date: run.start_date_local.slice(0, 10),
          distance: (run.distance / M_TO_DIST).toFixed(1) + ' ' + DIST_UNIT,
          time: run.moving_time,
          blogUrl: meta?.url,
        };
      });
  }, [activities]);

  const totalPages = Math.ceil(races.length / PAGE_SIZE);
  const pagedRaces = races.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (races.length === 0) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6"
            style={{ color: 'var(--color-brand)' }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 3h12v2a6 6 0 01-4 5.66V14h3a1 1 0 011 1v1H8v-1a1 1 0 011-1h3v-3.34A6 6 0 018 5V3z" />
            <path d="M9 19h6v2H9z" />
          </svg>
          <h3 className="font-headline text-xl font-bold">Marathon Records</h3>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs opacity-60">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-1.5 py-0.5 disabled:opacity-30"
            >
              ‹
            </button>
            <span>
              {page + 1}/{totalPages}
            </span>
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
              <td className="whitespace-nowrap py-2 pr-3">{race.date}</td>
              <td className="py-2 pr-3 font-medium">
                {race.blogUrl ? (
                  <a
                    href={race.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline decoration-1 underline-offset-2 hover:decoration-2"
                  >
                    {race.name}
                  </a>
                ) : (
                  race.name
                )}
              </td>
              <td className="whitespace-nowrap py-2 pr-3">{race.distance}</td>
              <td className="whitespace-nowrap py-2">{race.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RaceRecords;
