import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearSelector, {
  ProgressBar,
  YEARLY_GOAL,
  MONTHLY_GOAL,
} from '@/components/YearSelector';
import RaceRecords from '@/components/RaceRecords';
import MonthlyChart from '@/components/MonthlyChart';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import {
  Activity,
  filterAndSortRuns,
  filterYearRuns,
  sortDateFunc,
  RunIds,
  convertMovingTime2Sec,
} from '@/utils/utils';
import { useTheme } from '@/hooks/useTheme';
import { M_TO_DIST } from '@/utils/utils';

const Index = () => {
  const { siteTitle, siteUrl } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [currentFilter, setCurrentFilter] = useState<{
    item: string;
    func: (_run: Activity, _value: string) => boolean;
  }>({ item: thisYear, func: filterYearRuns });

  const selectedRunIdRef = useRef<number | null>(null);
  const selectedRunDateRef = useRef<string | null>(null);

  // Compute all-time totals (only type === 'Run') for stat cards
  const allTimeStats = useMemo(() => {
    const runOnly = activities.filter((r) => r.type === 'Run');
    let totalDistance = 0;
    let totalSeconds = 0;
    runOnly.forEach((run) => {
      totalDistance += run.distance || 0;
      totalSeconds += convertMovingTime2Sec(run.moving_time);
    });
    const totalHours = Math.floor(totalSeconds / 3600);
    return {
      count: runOnly.length,
      distanceKm: parseFloat((totalDistance / M_TO_DIST).toFixed(0)),
      hours: totalHours,
    };
  }, [activities]);

  // Compute year/month stats for progress bars
  const yearStats = useMemo(() => {
    const now = new Date();
    const displayYear = year === 'Total' ? String(now.getFullYear()) : year;
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let yearDistance = 0;
    let monthDistance = 0;
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
      yearDistanceKm: parseFloat((yearDistance / M_TO_DIST).toFixed(1)),
      monthDistanceKm: parseFloat((monthDistance / M_TO_DIST).toFixed(1)),
    };
  }, [activities, year]);

  // Memoize expensive calculations
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

  // For RunTable compatibility
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
    if (year !== 'Total') {
      return;
    }

    let svgStat = document.getElementById('svgStat');
    if (!svgStat) {
      return;
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        const descEl = target.querySelector('desc');
        if (descEl) {
          const runId = Number(descEl.innerHTML);
          if (!runId) {
            return;
          }
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
          if (!runIDsOnDate.length) {
            return;
          }
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
  }, [year]);

  const { theme } = useTheme();

  return (
    <Layout>
      <Helmet>
        <html lang="en" data-theme={theme} />
      </Helmet>
      {/* Row 1: Stat cards + Race Records */}
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left 3/5: Three stat cards */}
        <div className="grid grid-cols-3 gap-4 lg:col-span-3">
          <div className="rounded-2xl bg-[var(--color-activity-card)] p-4">
            <div className="mb-1 text-xs opacity-60">总记录</div>
            <div className="text-2xl font-bold italic">
              {allTimeStats.count}{' '}
              <span className="text-sm font-normal opacity-50">次</span>
            </div>
            <div className="text-2xl font-bold italic">
              {allTimeStats.distanceKm}{' '}
              <span className="text-sm font-normal opacity-50">km</span>
            </div>
            <div className="text-2xl font-bold italic">
              {allTimeStats.hours}{' '}
              <span className="text-sm font-normal opacity-50">小时</span>
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--color-activity-card)] p-4">
            <div className="mb-2 text-xs opacity-60">
              {yearStats.displayYear} 年度跑量
            </div>
            <ProgressBar
              current={yearStats.yearDistanceKm}
              goal={YEARLY_GOAL}
              unit="km"
            />
          </div>
          <div className="rounded-2xl bg-[var(--color-activity-card)] p-4">
            <div className="mb-2 text-xs opacity-60">本月跑量</div>
            <ProgressBar
              current={yearStats.monthDistanceKm}
              goal={MONTHLY_GOAL}
              unit="km"
            />
          </div>
        </div>
        {/* Right 2/5: Race Records */}
        <div className="lg:col-span-2">
          <RaceRecords locateActivity={locateActivity} />
        </div>
      </div>

      {/* Row 2: Two columns 2:3 — Left: Year Selector + Monthly Chart, Right: Table/SVG */}
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Left column: Year Selector + Monthly Chart */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-2xl bg-[var(--color-activity-card)] p-4">
            <h1 className="mb-4 text-4xl font-extrabold italic">
              <a href={siteUrl}>{siteTitle}</a>
            </h1>
            <YearSelector year={year} onClick={changeYear} />
          </div>
          <MonthlyChart year={year} />
        </div>

        {/* Right column: Run history */}
        <div className="flex flex-col lg:col-span-3">
          <div className="flex flex-1 flex-col rounded-2xl bg-[var(--color-activity-card)] p-4">
            {year === 'Total' ? (
              <SVGStat />
            ) : (
              <RunTable
                runs={runs}
                locateActivity={locateActivity}
                setActivity={setActivity}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />
            )}
          </div>
        </div>
      </div>
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
