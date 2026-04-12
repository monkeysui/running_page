import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import RunTable from '@/components/RunTable';
import RaceRecords from '@/components/RaceRecords';
import MonthlyChart from '@/components/MonthlyChart';
import YearHeatmap from '@/components/YearHeatmap';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import {
  Activity,
  filterAndSortRuns,
  filterYearRuns,
  sortDateFunc,
  RunIds,
  convertMovingTime2Sec,
  formatPace,
  M_TO_DIST,
  DIST_UNIT,
} from '@/utils/utils';
import { useTheme } from '@/hooks/useTheme';
import { INFO_MESSAGE } from '@/utils/const';

const YEARLY_GOAL = 1000; // km
const MONTHLY_GOAL = 100; // km

// Inline monochrome icons (avoid adding lucide dependency)
const IconRepeat = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);
const IconRoute = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M12 19h4.5a3.5 3.5 0 000-7h-8a3.5 3.5 0 010-7H12" />
  </svg>
);
const IconTimer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M9 2h6" />
  </svg>
);
const IconBolt = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

interface ProgressCardProps {
  title: string;
  current: number;
  goal: number;
  unit: string;
}
const ProgressCard = ({ title, current, goal, unit }: ProgressCardProps) => {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div className="bg-surface-card-low flex h-full flex-col justify-between gap-4 rounded-2xl p-6">
      <div className="flex items-end justify-between">
        <span className="font-headline text-sm font-bold">{title}</span>
        <span
          className="font-headline text-xl font-bold tracking-tight"
          style={{
            color:
              pct > 0 ? 'var(--color-brand)' : 'var(--color-on-surface-variant)',
          }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="bg-surface-variant h-3 overflow-hidden rounded-full">
        <div
          className="glow-brand h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--color-brand), var(--color-secondary))',
          }}
        />
      </div>
      <div className="text-muted flex justify-between text-xs font-medium">
        <span>
          {current.toFixed(1)} {unit}
        </span>
        <span>
          Goal: {goal} {unit}
        </span>
      </div>
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: (_props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  accent?: boolean;
}
const MetricCard = ({ label, value, unit, icon: Icon, accent }: MetricCardProps) => (
  <div
    className={`bg-surface-card-high mini-trend-bg group flex flex-col justify-between rounded-2xl p-6 transition-transform hover:scale-[1.02] ${
      accent ? 'border-l-2' : ''
    }`}
    style={accent ? { borderLeftColor: 'color-mix(in srgb, var(--color-brand) 40%, transparent)' } : undefined}
  >
    <div className="flex items-start justify-between">
      <span className="text-muted text-[11px] font-semibold uppercase tracking-widest">
        {label}
      </span>
      <Icon className="h-5 w-5" style={{ color: 'var(--color-brand)' }} />
    </div>
    <div className="mt-8">
      <div className="font-headline text-5xl font-extrabold tracking-tighter">
        {value}
      </div>
      <div className="text-muted mt-1 text-sm">{unit}</div>
    </div>
  </div>
);

const Index = () => {
  const { siteTitle, siteUrl } = useSiteMetadata();
  const { activities, thisYear, years } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [currentFilter, setCurrentFilter] = useState<{
    item: string;
    func: (_run: Activity, _value: string) => boolean;
  }>({ item: thisYear, func: filterYearRuns });

  const selectedRunIdRef = useRef<number | null>(null);
  const selectedRunDateRef = useRef<string | null>(null);

  const yearsWithTotal = useMemo(() => [...years, 'Total'], [years]);

  // All-time run totals for metric cards
  const allTimeStats = useMemo(() => {
    const runOnly = activities.filter((r) => r.type === 'Run');
    let totalDistance = 0;
    let totalSeconds = 0;
    runOnly.forEach((run) => {
      totalDistance += run.distance || 0;
      totalSeconds += convertMovingTime2Sec(run.moving_time);
    });
    return {
      count: runOnly.length,
      distanceKm: parseFloat((totalDistance / M_TO_DIST).toFixed(0)),
      hours: Math.floor(totalSeconds / 3600),
    };
  }, [activities]);

  // Stats for current selected year (for QuickStats + ProgressCards)
  const selectedStats = useMemo(() => {
    const now = new Date();
    const displayYear = year === 'Total' ? String(now.getFullYear()) : year;
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const filtered =
      year === 'Total'
        ? activities
        : activities.filter((r) => r.start_date_local.slice(0, 4) === year);

    let totalMetersAvail = 0;
    let totalSecondsAvail = 0;
    let heartRate = 0;
    let heartRateCount = 0;
    let maxStreak = 0;
    let yearDistance = 0;
    let monthDistance = 0;

    filtered.forEach((run) => {
      if (run.average_speed) {
        totalMetersAvail += run.distance || 0;
        totalSecondsAvail += (run.distance || 0) / run.average_speed;
      }
      if (run.average_heartrate) {
        heartRate += run.average_heartrate;
        heartRateCount++;
      }
      if (run.streak) maxStreak = Math.max(maxStreak, run.streak);
    });

    activities.forEach((run) => {
      if (run.start_date_local.slice(0, 4) === displayYear) {
        yearDistance += run.distance || 0;
      }
      if (run.start_date_local.slice(0, 7) === currentMonth) {
        monthDistance += run.distance || 0;
      }
    });

    return {
      displayYear,
      pace:
        totalMetersAvail > 0
          ? formatPace(totalMetersAvail / totalSecondsAvail)
          : '—',
      avgHr:
        heartRateCount > 0 ? (heartRate / heartRateCount).toFixed(0) : null,
      streak: maxStreak,
      yearDistanceKm: parseFloat((yearDistance / M_TO_DIST).toFixed(1)),
      monthDistanceKm: parseFloat((monthDistance / M_TO_DIST).toFixed(1)),
    };
  }, [activities, year]);

  const runs = useMemo(() => {
    return filterAndSortRuns(
      activities,
      currentFilter.item,
      currentFilter.func,
      sortDateFunc
    );
  }, [activities, currentFilter.item, currentFilter.func]);

  const changeYear = useCallback((y: string) => {
    setYear(y);
    setCurrentFilter({ item: y, func: filterYearRuns });
    setRunIndex(-1);
  }, []);

  const setActivity = useCallback((_newRuns: Activity[]) => {
    console.warn('setActivity called but runs are now computed from filters');
  }, []);

  const locateActivity = useCallback(
    (runIds: RunIds) => {
      if (runIds.length === 1) {
        const runId = runIds[0];
        const runIdx = runs.findIndex((run) => run.run_id === runId);
        setRunIndex(runIdx);
      } else {
        setRunIndex(-1);
      }
    },
    [runs]
  );

  useEffect(() => {
    if (year !== 'Total') return;
    const svgStat = document.getElementById('svgStat');
    if (!svgStat) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        const descEl = target.querySelector('desc');
        if (descEl) {
          const runId = Number(descEl.innerHTML);
          if (!runId) return;
          if (selectedRunIdRef.current === runId) {
            selectedRunIdRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunIdRef.current = runId;
            locateActivity([runId]);
          }
          return;
        }
        const titleEl = target.querySelector('title');
        if (titleEl) {
          const [runDate] = titleEl.innerHTML.match(
            /\d{4}-\d{1,2}-\d{1,2}/
          ) || [`${+thisYear + 1}`];
          const runIDsOnDate = runs
            .filter((r) => r.start_date_local.slice(0, 10) === runDate)
            .map((r) => r.run_id);
          if (!runIDsOnDate.length) return;
          if (selectedRunDateRef.current === runDate) {
            selectedRunDateRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunDateRef.current = runDate;
            locateActivity(runIDsOnDate);
          }
        }
      }
    };
    svgStat.addEventListener('click', handleClick);
    return () => {
      svgStat && svgStat.removeEventListener('click', handleClick);
    };
  }, [year, runs, thisYear, locateActivity]);

  const { theme } = useTheme();
  const infoMessage = INFO_MESSAGE(years.length, year);

  return (
    <Layout>
      <Helmet>
        <html lang="en" data-theme={theme} />
      </Helmet>

      {/* Title + year pills */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter md:text-5xl">
            <a href={siteUrl}>{siteTitle}</a>
          </h1>
          <p className="text-muted mt-2 text-sm">{infoMessage}</p>
        </div>
        <div
          className="bg-surface-card-low flex flex-wrap items-center gap-1 rounded-full border border-white/5 p-1"
        >
          {yearsWithTotal.map((y) => (
            <button
              key={y}
              onClick={() => changeYear(y)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                y === year
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-text-primary)]'
              }`}
              style={
                y === year
                  ? { backgroundColor: 'var(--color-surface-variant)', fontWeight: 700 }
                  : undefined
              }
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: metric cards + QuickStats sidebar */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-8">
          <MetricCard
            label="Total Frequency"
            value={allTimeStats.count}
            unit="times"
            icon={IconRepeat}
          />
          <MetricCard
            label="Total Distance"
            value={allTimeStats.distanceKm}
            unit={DIST_UNIT}
            icon={IconRoute}
            accent
          />
          <MetricCard
            label="Total Time"
            value={allTimeStats.hours}
            unit="hours"
            icon={IconTimer}
          />
        </div>

        {/* Quick Stats card */}
        <div className="lg:col-span-4">
          <div
            className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-6"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent-purple) 8%, var(--color-surface-container))',
              borderColor: 'color-mix(in srgb, var(--color-accent-purple) 15%, transparent)',
            }}
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: 'var(--color-accent-purple)' }}
            />
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-accent-purple) 20%, transparent)',
                    color: 'var(--color-accent-purple)',
                  }}
                >
                  <IconBolt className="h-5 w-5" />
                </div>
                <h3 className="font-headline text-xl font-bold">Quick Stats</h3>
                <span className="text-muted ml-auto text-xs font-medium">
                  {selectedStats.displayYear}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-sm">Avg Pace</span>
                  <span className="font-headline text-lg font-bold">
                    {selectedStats.pace}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-sm">Avg Heart Rate</span>
                  <span
                    className="font-headline text-lg font-bold"
                    style={{ color: 'var(--color-accent-red)' }}
                  >
                    {selectedStats.avgHr ? `${selectedStats.avgHr} bpm` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-sm">Current Streak</span>
                  <span
                    className="font-headline text-lg font-bold"
                    style={{ color: 'var(--color-brand)' }}
                  >
                    {selectedStats.streak} day
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: progress cards + heatmap (hidden on Total view) */}
      {year !== 'Total' && (
        <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
          <div className="flex flex-col gap-6 xl:col-span-4">
            <div className="flex-1">
              <ProgressCard
                title={`${selectedStats.displayYear} Annual Progress`}
                current={selectedStats.yearDistanceKm}
                goal={YEARLY_GOAL}
                unit="km"
              />
            </div>
            <div className="flex-1">
              <ProgressCard
                title={`${selectedStats.displayYear} Monthly Progress`}
                current={selectedStats.monthDistanceKm}
                goal={MONTHLY_GOAL}
                unit="km"
              />
            </div>
          </div>
          <div className="xl:col-span-8">
            <div className="bg-surface-card flex h-full flex-col overflow-hidden rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-headline text-xl font-bold">
                  Activity Intensity {year}
                </h3>
                <div className="text-sm font-medium">
                  <span
                    style={{
                      color: 'var(--color-text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    {selectedStats.yearDistanceKm} km
                  </span>{' '}
                  <span className="text-muted">Total for {year}</span>
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <YearHeatmap year={year} />
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Row 3: monthly chart + race records */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="bg-surface-card rounded-2xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-headline text-xl font-bold">
              {year === 'Total' ? 'Yearly Distance' : 'Monthly Distance'}
            </h3>
            <span className="text-muted font-headline text-xs font-bold uppercase tracking-widest">
              {year}
            </span>
          </div>
          <MonthlyChart year={year} />
        </div>
        <div className="bg-surface-card rounded-2xl p-6">
          <RaceRecords locateActivity={locateActivity} />
        </div>
      </section>

      {/* Row 4: run logs table */}
      {year !== 'Total' && (
        <section className="bg-surface-card rounded-2xl p-6">
          <h3 className="font-headline mb-4 text-xl font-bold">
            Latest Run Logs
          </h3>
          <RunTable
            runs={runs}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
          />
        </section>
      )}

      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
