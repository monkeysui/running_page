import React, { useState, useMemo, useCallback } from 'react';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';
import { DIST_UNIT } from '@/utils/utils';

import RunRow from './RunRow';
import styles from './style.module.css';

const PAGE_SIZE = 12;

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  const [sortFuncInfo, setSortFuncInfo] = useState('');
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(runs.length / PAGE_SIZE);

  // Memoize sort functions to prevent recreating them on every render
  const sortFunctions = useMemo(() => {
    const sortKMFunc: SortFunc = (a, b) =>
      sortFuncInfo === DIST_UNIT
        ? a.distance - b.distance
        : b.distance - a.distance;
    const sortElevationGainFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'Elev'
        ? (a.elevation_gain ?? 0) - (b.elevation_gain ?? 0)
        : (b.elevation_gain ?? 0) - (a.elevation_gain ?? 0);
    const sortPaceFunc: SortFunc = (a, b) =>
      sortFuncInfo === 'Pace'
        ? a.average_speed - b.average_speed
        : b.average_speed - a.average_speed;
    const sortBPMFunc: SortFunc = (a, b) => {
      return sortFuncInfo === 'BPM'
        ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
        : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
    };
    const sortRunTimeFunc: SortFunc = (a, b) => {
      const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
      const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
      return sortFuncInfo === 'Time'
        ? aTotalSeconds - bTotalSeconds
        : bTotalSeconds - aTotalSeconds;
    };
    const sortDateFuncClick =
      sortFuncInfo === 'Date' ? sortDateFunc : sortDateFuncReverse;

    const sortFuncMap = new Map([
      [DIST_UNIT, sortKMFunc],
      ['Elev', sortElevationGainFunc],
      ['Pace', sortPaceFunc],
      ['BPM', sortBPMFunc],
      ['Time', sortRunTimeFunc],
      ['Date', sortDateFuncClick],
    ]);

    if (!SHOW_ELEVATION_GAIN) {
      sortFuncMap.delete('Elev');
    }

    return sortFuncMap;
  }, [sortFuncInfo]);

  const handleClick = useCallback<React.MouseEventHandler<HTMLElement>>(
    (e) => {
      const funcName = (e.target as HTMLElement).innerHTML;
      const f = sortFunctions.get(funcName);

      setRunIndex(-1);
      setPage(0);
      setSortFuncInfo(sortFuncInfo === funcName ? '' : funcName);
      setActivity(runs.sort(f));
    },
    [sortFunctions, sortFuncInfo, runs, setRunIndex, setActivity]
  );

  const pagedRuns = runs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col">
      <div className={styles.tableContainer}>
        <table className={styles.runTable} cellSpacing="0" cellPadding="0">
          <thead>
            <tr>
              <th />
              {Array.from(sortFunctions.keys()).map((k) => (
                <th key={k} onClick={handleClick}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRuns.map((run, elementIndex) => (
              <RunRow
                key={run.run_id}
                elementIndex={page * PAGE_SIZE + elementIndex}
                locateActivity={locateActivity}
                run={run}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-auto flex items-center justify-center gap-3 pt-4 text-sm opacity-60">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 disabled:opacity-30"
          >
            ‹ 上一页
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-2 py-1 disabled:opacity-30"
          >
            下一页 ›
          </button>
        </div>
      )}
    </div>
  );
};

export default RunTable;
