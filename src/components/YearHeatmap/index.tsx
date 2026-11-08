import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import useActivities from '@/hooks/useActivities';
import { M_TO_DIST } from '@/utils/utils';
import {
  ACTIVITY_TYPE_COLORS,
  DASHBOARD_ACTIVITY_TYPES,
  DashboardActivityType,
  normalizeDashboardActivityType,
} from '@/utils/activityTypes';

interface IYearHeatmapProps {
  year: string;
  totalDistanceKm: number;
}

const EMPTY_COLOR = 'var(--color-surface-variant)';

// Distance (km) thresholds for shade levels 2/3/4. Level 1 = any activity > 0.
const THRESHOLDS: Record<DashboardActivityType, [number, number, number]> = {
  Run: [3, 7, 12],
  Ride: [10, 25, 50],
  Hike: [4, 8, 15],
  Swim: [0.5, 1.5, 3],
};
const SHADE_PCT = [28, 52, 76, 100];

const shadeFor = (type: DashboardActivityType, km: number): string => {
  const [t2, t3, t4] = THRESHOLDS[type];
  const level = km >= t4 ? 4 : km >= t3 ? 3 : km >= t2 ? 2 : 1;
  const pct = SHADE_PCT[level - 1];
  return `color-mix(in srgb, ${ACTIVITY_TYPE_COLORS[type]} ${pct}%, ${EMPTY_COLOR})`;
};

const legendShade = (
  type: DashboardActivityType,
  pct: number,
  empty = EMPTY_COLOR
) => `color-mix(in srgb, ${ACTIVITY_TYPE_COLORS[type]} ${pct}%, ${empty})`;

const MONTHS = [
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
const DOW_LABEL = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const CELL = 11;
const GAP = 3;
const STRIDE = CELL + GAP;
const LEFT_PAD = 28;
const TOP_PAD = 18;
const EXPORT_PAD = 16;
const EXPORT_GRID_TOP = 50;
const EXPORT_LEGEND_HEIGHT = 38;

const pad2 = (n: number) => String(n).padStart(2, '0');

const YearHeatmap = ({ year, totalDistanceKm }: IYearHeatmapProps) => {
  const { activities } = useActivities();

  const { cells, weekCount, totals } = useMemo(() => {
    const y = parseInt(year, 10);
    // Build a map of date -> dominant activity (by distance)
    const dayMap = new Map<
      string,
      { type: DashboardActivityType; distance: number }
    >();
    let runMeters = 0;
    let rideMeters = 0;
    let hikeMeters = 0;
    let swimMeters = 0;
    let runCount = 0;
    let rideCount = 0;
    let hikeCount = 0;
    let swimCount = 0;

    activities.forEach((r) => {
      if (r.start_date_local.slice(0, 4) !== year) return;
      const date = r.start_date_local.slice(0, 10);
      const type = normalizeDashboardActivityType(r.type);
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
      } else if (type === 'Swim') {
        swimMeters += distance;
        swimCount += 1;
      }
      if (!type) return;
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
      type: DashboardActivityType | null;
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
        color: hit ? shadeFor(hit.type, distanceKm) : EMPTY_COLOR,
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
        Run: { count: runCount, km: runMeters / M_TO_DIST },
        Ride: { count: rideCount, km: rideMeters / M_TO_DIST },
        Hike: { count: hikeCount, km: hikeMeters / M_TO_DIST },
        Swim: { count: swimCount, km: swimMeters / M_TO_DIST },
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
  const exportWidth = width + 2 * EXPORT_PAD;
  const exportHeight = EXPORT_GRID_TOP + height + EXPORT_LEGEND_HEIGHT;

  const chartRef = useRef<SVGSVGElement>(null);
  const [image, setImage] = useState<{
    cells: typeof cells;
    totalDistanceKm: number;
    src: string;
  }>();
  const imageSrc =
    image?.cells === cells && image.totalDistanceKm === totalDistanceKm
      ? image.src
      : undefined;

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const styles = getComputedStyle(chart);
    const emptyColor = styles.getPropertyValue('--color-surface-variant');
    const mutedColor = styles.getPropertyValue('--color-on-surface-variant');
    const snapshot = chart.cloneNode(true) as SVGSVGElement;
    snapshot.removeAttribute('class');
    snapshot.removeAttribute('style');
    snapshot.setAttribute('width', String(width));
    snapshot.setAttribute('height', String(height));
    snapshot.style.color = styles.color;
    snapshot.style.fontFamily = styles.fontFamily;
    snapshot.style.setProperty('--color-surface-variant', emptyColor);

    const canvas = document.createElement('canvas');
    const scale = 3;
    canvas.width = exportWidth * scale;
    canvas.height = exportHeight * scale;
    const context = canvas.getContext('2d');
    if (!context) return;
    const background = styles.getPropertyValue('--color-surface-container');
    const source = new Image();
    source.onload = () => {
      context.scale(scale, scale);
      context.fillStyle = background;
      context.fillRect(0, 0, exportWidth, exportHeight);
      context.drawImage(source, EXPORT_PAD, EXPORT_GRID_TOP, width, height);

      context.textBaseline = 'middle';
      context.fillStyle = styles.color;
      context.font = `700 14px ${styles.fontFamily}`;
      context.fillText(`Activity Heatmap ${year}`, EXPORT_PAD, 26);

      const distance = `${totalDistanceKm} km`;
      const right = exportWidth - EXPORT_PAD;
      context.textAlign = 'right';
      context.font = `500 11px ${styles.fontFamily}`;
      context.fillStyle = mutedColor;
      context.fillText('total', right, 26);
      const distanceEnd = right - context.measureText('total').width - 4;
      context.font = `700 11px ${styles.fontFamily}`;
      context.fillStyle = styles.color;
      context.fillText(distance, distanceEnd, 26);

      context.textAlign = 'left';
      context.font = `10px ${styles.fontFamily}`;
      const legendY = EXPORT_GRID_TOP + height + 12;
      let legendX = EXPORT_PAD;
      for (const type of DASHBOARD_ACTIVITY_TYPES) {
        for (const pct of SHADE_PCT) {
          context.fillStyle = legendShade(type, pct, emptyColor);
          context.beginPath();
          context.arc(legendX + 4, legendY, 4, 0, Math.PI * 2);
          context.fill();
          legendX += 10;
        }
        const { count, km } = totals[type];
        const label = `${type} · ${count} · ${km.toFixed(0)} km`;
        context.fillStyle = mutedColor;
        context.fillText(label, legendX + 3, legendY);
        legendX += context.measureText(label).width + 22;
      }
      setImage({ cells, totalDistanceKm, src: canvas.toDataURL('image/png') });
    };
    source.src = `data:image/svg+xml,${encodeURIComponent(
      new XMLSerializer().serializeToString(snapshot)
    )}`;

    return () => {
      source.onload = null;
    };
  }, [
    cells,
    exportHeight,
    exportWidth,
    height,
    totalDistanceKm,
    totals,
    width,
    year,
  ]);

  const updateDayTitle = (event: MouseEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const bounds = img.getBoundingClientRect();
    const x =
      ((event.clientX - bounds.left) * exportWidth) / bounds.width -
      EXPORT_PAD -
      LEFT_PAD;
    const y =
      ((event.clientY - bounds.top) * exportHeight) / bounds.height -
      EXPORT_GRID_TOP -
      TOP_PAD;
    const cell =
      x >= 0 && y >= 0 && x % STRIDE < CELL && y % STRIDE < CELL
        ? cells.find(
            (c) =>
              c.x === Math.floor(x / STRIDE) && c.y === Math.floor(y / STRIDE)
          )
        : undefined;
    img.title = cell
      ? `${cell.date}${cell.type ? ` · ${cell.type} ${cell.distanceKm.toFixed(1)}km` : ''}`
      : '';
  };

  return (
    <div className="w-full">
      {imageSrc && (
        // Keep the responsive HTML heading and legend on screen. The browser
        // saves the full image when the user right-clicks the visible grid.
        <div
          className="relative mx-auto w-full overflow-hidden"
          style={{
            aspectRatio: width / height,
            maxWidth: (180 * width) / height,
          }}
        >
          <img
            src={imageSrc}
            alt={`Activity Heatmap ${year}`}
            width={exportWidth}
            height={exportHeight}
            className="absolute block h-auto max-w-none"
            style={{
              left: `${(-100 * EXPORT_PAD) / width}%`,
              top: `${(-100 * EXPORT_GRID_TOP) / height}%`,
              width: `${(100 * exportWidth) / width}%`,
            }}
            onMouseMove={updateDayTitle}
          />
        </div>
      )}
      <svg
        ref={chartRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full"
        style={{ maxHeight: 180, display: imageSrc ? 'none' : undefined }}
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
        {DASHBOARD_ACTIVITY_TYPES.map((t) => {
          const totalsFor = totals[t];
          return (
            <div key={t} className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                {SHADE_PCT.map((pct) => (
                  <span
                    key={pct}
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: legendShade(t, pct) }}
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
