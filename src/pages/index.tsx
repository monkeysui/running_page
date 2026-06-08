import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import RunTable from '@/components/RunTable';
import RaceRecords from '@/components/RaceRecords';
import MonthlyChart from '@/components/MonthlyChart';
import YearHeatmap from '@/components/YearHeatmap';
import ProgressCard from '@/components/ProgressCard';
import StreakCard from '@/components/StreakCard';
import ProfileSidebar from '@/components/ProfileSidebar';
import PersonalBest from '@/components/PersonalBest';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import {
  Activity,
  filterAndSortRuns,
  filterYearRuns,
  sortDateFunc,
  RunIds,
  M_TO_DIST,
} from '@/utils/utils';
import {
  computePeriodStats,
  computeStreak,
  computePersonalBests,
} from '@/utils/stats';
import { useTheme } from '@/hooks/useTheme';
import { INFO_MESSAGE } from '@/utils/const';

const YEARLY_GOAL = 1000; // km
const MONTHLY_GOAL = 100; // km
const WEEKLY_GOAL = 25; // km

const Index = () => {
  const { siteTitle, siteUrl } = useSiteMetadata();
  const { activities, thisYear, years, countries, provinces } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [currentFilter, setCurrentFilter] = useState<{
    item: string;
    func: (_run: Activity, _value: string) => boolean;
  }>({ item: thisYear, func: filterYearRuns });

  const selectedRunIdRef = useRef<number | null>(null);
  const selectedRunDateRef = useRef<string | null>(null);

  const yearsWithTotal = useMemo(() => [...years, 'Total'], [years]);

  const runActivities = useMemo(
    () => activities.filter((r) => r.type === 'Run'),
    [activities]
  );

  // Period comparisons (year / month / week) — always computed against "now"
  const periodStats = useMemo(() => {
    const now = new Date();
    return {
      year: computePeriodStats(runActivities, 'year', now),
      month: computePeriodStats(runActivities, 'month', now),
      week: computePeriodStats(runActivities, 'week', now),
    };
  }, [runActivities]);

  const streakInfo = useMemo(
    () => computeStreak(runActivities),
    [runActivities]
  );

  const personalBests = useMemo(
    () => computePersonalBests(runActivities),
    [runActivities]
  );

  // Distance for currently selected year (used for heatmap header)
  const selectedYearDistanceKm = useMemo(() => {
    const displayYear = year === 'Total' ? thisYear : year;
    let meters = 0;
    activities.forEach((r) => {
      if (r.start_date_local.slice(0, 4) === displayYear) {
        meters += r.distance || 0;
      }
    });
    return parseFloat((meters / M_TO_DIST).toFixed(1));
  }, [activities, year, thisYear]);

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
        <div className="bg-surface-card-low flex flex-wrap items-center gap-1 overflow-hidden rounded-3xl border border-white/5 p-1">
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
                  ? {
                      backgroundColor: 'var(--color-surface-variant)',
                      fontWeight: 700,
                    }
                  : undefined
              }
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Goals (4 cards) | Profile */}
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:col-span-8">
          <ProgressCard
            label="Yearly Goal"
            period="year"
            goalKm={YEARLY_GOAL}
            comparison={periodStats.year}
          />
          <ProgressCard
            label="Monthly Goal"
            period="month"
            goalKm={MONTHLY_GOAL}
            comparison={periodStats.month}
          />
          <ProgressCard
            label="Weekly Goal"
            period="week"
            goalKm={WEEKLY_GOAL}
            comparison={periodStats.week}
          />
          <StreakCard info={streakInfo} />
        </div>
        <div className="lg:col-span-4">
          <ProfileSidebar
            activities={activities}
            countries={countries}
            provinces={provinces}
            years={years}
          />
        </div>
      </section>

      {/* Row 2: Heatmap | Monthly chart */}
      {year !== 'Total' && (
        <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <div className="bg-surface-card flex h-full flex-col overflow-hidden rounded-2xl p-5 transition-transform hover:scale-[1.005] lg:col-span-8">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold">
                Activity Heatmap {year}
              </h3>
              <div className="text-xs font-medium">
                <span
                  style={{
                    color: 'var(--color-text-primary)',
                    fontWeight: 700,
                  }}
                >
                  {selectedYearDistanceKm} km
                </span>{' '}
                <span className="text-muted">total</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <YearHeatmap year={year} />
            </div>
          </div>
          <div className="bg-surface-card flex h-full flex-col rounded-2xl p-6 transition-transform hover:scale-[1.005] lg:col-span-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold">
                Monthly Distance
              </h3>
              <span className="text-muted font-headline text-xs font-bold tracking-widest uppercase">
                {year}
              </span>
            </div>
            <MonthlyChart year={year} />
          </div>
        </section>
      )}

      {/* Row 3: Run logs | Personal Best + Marathon */}
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="bg-surface-card flex h-full flex-col rounded-2xl p-6 transition-transform hover:scale-[1.005] lg:col-span-8">
          <h3 className="font-headline mb-4 text-xl font-bold">
            {year === 'Total' ? 'All Run Logs' : 'Latest Run Logs'}
          </h3>
          <RunTable
            runs={runs}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
          />
        </div>
        <div className="flex h-full flex-col gap-6 lg:col-span-4">
          <PersonalBest bests={personalBests} />
          <div className="bg-surface-card flex flex-1 flex-col rounded-2xl p-6 transition-transform hover:scale-[1.005]">
            <RaceRecords locateActivity={locateActivity} />
          </div>
        </div>
      </section>

      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
