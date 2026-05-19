import { useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST } from '@/utils/utils';

interface IYearHeatmapProps {
  year: string;
}

type CellType = 'Run' | 'Ride' | 'Hike' | 'Other';
type ActiveType = Exclude<CellType, 'Other'>;

const TYPE_BASE: Record<ActiveType, string> = {
  Run: '#ff9e3f',
  Ride: '#5fb7e6',
  Hike: '#6bcb77',
};
const EMPTY_COLOR = 'var(--color-surface-variant)';

// Distance (km) thresholds for shade levels 2/3/4. Level 1 = any activity > 0.
const THRESHOLDS: Record<ActiveType, [number, number, number]> = {
  Run: [3, 7, 12],
  Ride: [10, 25, 50],
  Hike: [4, 8, 15],
};
const SHADE_PCT = [28, 52, 76, 100];

const shadeFor = (type: ActiveType, km: number): string => {
  const [t2, t3, t4] = THRESHOLDS[type];
  const level = km >= t4 ? 4 : km >= t3 ? 3 : km >= t2 ? 2 : 1;
  const pct = SHADE_PCT[level - 1];
  return `color-mix(in srgb, ${TYPE_BASE[type]} ${pct}%, ${EMPTY_COLOR})`;
};

const legendShade = (type: ActiveType, level: number) =>
  `color-mix(in srgb, ${TYPE_BASE[type]} ${SHADE_PCT[level - 1]}%, var(--color-surface-variant))`;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DOW_LABEL = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const CELL = 11;
const GAP = 3;
const STRIDE = CELL + GAP;
const LEFT_PAD = 28;
const TOP_PAD = 18;

const pad2 = (n: number) => String(n).padStart(2, '0');

const normalizeType = (t: string): CellType => {
  if (t === 'Run') return 'Run';
  if (t === 'Ride') return 'Ride';
  if (t === 'Hike') return 'Hike';
  return 'Other';
};

const YearHeatmap = ({ year }: IYearHeatmapProps) => {
  const { activities } = useActivities();

  const { cells, weekCount, totals } = useMemo(() => {
    const y = parseInt(year, 10);
    // Build a map of date -> dominant activity (by distance)
    const dayMap = new Map<string, { type: CellType; distance: number }>();
    let runMeters = 0;
    let rideMeters = 0;
    let hikeMeters = 0;
    let runCount = 0;
    let rideCount = 0;
    let hikeCount = 0;

    activities.forEach((r) => {
      if (r.start_date_local.slice(0, 4) !== year) return;
      const date = r.start_date_local.slice(0, 10);
      const type = normalizeType(r.type);
      const distance = r.distance || 0;
      if (type === 'Run') {
        runMeters += distance;
        runCount += 1;
      } else if (type === 'Ride') {
        rideMeters += distance;
        rideCount += 1;
      } else if (type === 'Hike') {
        hikeMeters += distance;
        hikeCount += 1;
      }
      if (type === 'Other') return;
      const cur = dayMap.get(date);
      if (!cur || distance > cur.distance) {
        dayMap.set(date, { type, distance });
      }
    });

    // Walk every day of year, place in grid (week column, day row)
    interface Cell {
      date: string;
      x: number;
      y: number;
      color: string;
      type: CellType | null;
      distanceKm: number;
    }
    const out: Cell[] = [];
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    // First column index: weeks since Monday-aligned start
    // Calculate the Monday of the week containing Jan 1
    const jan1Dow = (start.getDay() + 6) % 7; // 0 = Monday
    const gridStart = new Date(y, 0, 1 - jan1Dow);

    let maxCol = 0;
    const cur = new Date(y, 0, 1);
    while (cur.getTime() <= end.getTime()) {
      const diffDays = Math.round(
        (cur.getTime() - gridStart.getTime()) / 86400000
      );
      const col = Math.floor(diffDays / 7);
      const row = diffDays % 7;
      const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`;
      const hit = dayMap.get(key);
      const distanceKm = hit ? hit.distance / M_TO_DIST : 0;
      out.push({
        date: key,
        x: col,
        y: row,
        color: hit
          ? shadeFor(hit.type as ActiveType, distanceKm)
          : EMPTY_COLOR,
        type: hit?.type ?? null,
        distanceKm,
      });
      maxCol = Math.max(maxCol, col);
      cur.setDate(cur.getDate() + 1);
      if (out.length > 380) break;
    }

    return {
      cells: out,
      weekCount: maxCol + 1,
      totals: {
        runKm: runMeters / M_TO_DIST,
        rideKm: rideMeters / M_TO_DIST,
        hikeKm: hikeMeters / M_TO_DIST,
        runCount,
        rideCount,
        hikeCount,
      },
    };
  }, [activities, year]);

  // Compute month label x positions: place a label at the column of the first cell of each month
  const monthLabels = useMemo(() => {
    const seen = new Set<number>();
    const labels: { month: number; x: number }[] = [];
    cells.forEach((c) => {
      const m = parseInt(c.date.slice(5, 7), 10) - 1;
      const day = parseInt(c.date.slice(8, 10), 10);
      if (day <= 7 && !seen.has(m)) {
        labels.push({ month: m, x: LEFT_PAD + c.x * STRIDE });
        seen.add(m);
      }
    });
    return labels;
  }, [cells]);

  const width = LEFT_PAD + weekCount * STRIDE + 4;
  const height = TOP_PAD + 7 * STRIDE + 6;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full"
        style={{ maxHeight: 180 }}
      >
        {monthLabels.map((m) => (
          <text
            key={`m-${m.month}`}
            x={m.x}
            y={TOP_PAD - 6}
            fontSize="9"
            fill="currentColor"
            opacity="0.5"
          >
            {MONTHS[m.month]}
          </text>
        ))}
        {DOW_LABEL.map((label, i) =>
          label ? (
            <text
              key={`d-${i}`}
              x={0}
              y={TOP_PAD + i * STRIDE + CELL - 1}
              fontSize="9"
              fill="currentColor"
              opacity="0.5"
            >
              {label}
            </text>
          ) : null
        )}
        {cells.map((c) => (
          <rect
            key={c.date}
            x={LEFT_PAD + c.x * STRIDE}
            y={TOP_PAD + c.y * STRIDE}
            width={CELL}
            height={CELL}
            rx={2}
            ry={2}
            fill={c.color}
          >
            <title>
              {c.date}
              {c.type ? ` · ${c.type} ${c.distanceKm.toFixed(1)}km` : ''}
            </title>
          </rect>
        ))}
      </svg>

      <div className="text-muted mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
        {(['Run', 'Ride', 'Hike'] as ActiveType[]).map((t) => {
          const totalsFor = {
            Run: { count: totals.runCount, km: totals.runKm },
            Ride: { count: totals.rideCount, km: totals.rideKm },
            Hike: { count: totals.hikeCount, km: totals.hikeKm },
          }[t];
          return (
            <div key={t} className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                {[1, 2, 3, 4].map((lvl) => (
                  <span
                    key={lvl}
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: legendShade(t, lvl) }}
                  />
                ))}
              </span>
              <span>{t}</span>
              <span className="opacity-60">
                · {totalsFor.count} · {totalsFor.km.toFixed(0)} km
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YearHeatmap;
