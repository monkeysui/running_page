import { Activity, convertMovingTime2Sec, M_TO_DIST } from './utils';

export type Period = 'year' | 'month' | 'week';

const pad2 = (n: number) => String(n).padStart(2, '0');

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ISO week start (Monday) for a given date, with time set to 00:00:00 local
const startOfWeek = (d: Date): Date => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // 0 = Monday
  out.setDate(out.getDate() - dow);
  return out;
};

const parseLocalDate = (s: string): Date => {
  // start_date_local is "YYYY-MM-DD HH:MM:SS"
  const [date, time = '00:00:00'] = s.split(' ');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm, ss] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
};

export interface PeriodAggregate {
  distanceKm: number;
  count: number;
  hours: number;
  minutes: number; // remainder minutes
  totalSeconds: number;
}

const aggregate = (runs: Activity[]): PeriodAggregate => {
  let meters = 0;
  let seconds = 0;
  runs.forEach((r) => {
    meters += r.distance || 0;
    seconds += convertMovingTime2Sec(r.moving_time);
  });
  return {
    distanceKm: meters / M_TO_DIST,
    count: runs.length,
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    totalSeconds: seconds,
  };
};

// Return runs that fall within [start, endExclusive)
const inRange = (
  runs: Activity[],
  start: Date,
  endExclusive: Date
): Activity[] =>
  runs.filter((r) => {
    const d = parseLocalDate(r.start_date_local);
    return (
      d.getTime() >= start.getTime() && d.getTime() < endExclusive.getTime()
    );
  });

export interface PeriodComparison {
  current: PeriodAggregate;
  previous: PeriodAggregate;
  deltaKm: number; // current - previous
  periodLabel: string; // "this year", "this month", "this week"
  previousLabel: string; // "vs last year", etc.
}

// Returns this-period-to-date vs same-period-to-date previous cycle.
export const computePeriodStats = (
  runs: Activity[],
  period: Period,
  now: Date = new Date()
): PeriodComparison => {
  let curStart: Date;
  let curEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let periodLabel: string;
  let previousLabel: string;

  if (period === 'year') {
    curStart = new Date(now.getFullYear(), 0, 1);
    curEnd = new Date(now.getFullYear() + 1, 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
    prevEnd = new Date(now.getFullYear(), 0, 1);
    periodLabel = String(now.getFullYear());
    previousLabel = 'last year';
  } else if (period === 'month') {
    curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = now.toLocaleString('en-US', { month: 'short' });
    previousLabel = 'last month';
  } else {
    curStart = startOfWeek(now);
    curEnd = new Date(curStart);
    curEnd.setDate(curEnd.getDate() + 7);
    prevStart = new Date(curStart);
    prevStart.setDate(prevStart.getDate() - 7);
    prevEnd = new Date(curStart);
    periodLabel = 'this week';
    previousLabel = 'last week';
  }

  const current = aggregate(inRange(runs, curStart, curEnd));
  const previous = aggregate(inRange(runs, prevStart, prevEnd));
  return {
    current,
    previous,
    deltaKm: current.distanceKm - previous.distanceKm,
    periodLabel,
    previousLabel,
  };
};

export interface StreakInfo {
  current: number;
  longest: number;
  longestWeeks: number;
  recentDays: { date: Date; active: boolean; isToday: boolean }[]; // last 7 days, oldest first
}

// Compute current streak (consecutive days up to today/yesterday).
export const computeStreak = (
  runs: Activity[],
  now: Date = new Date()
): StreakInfo => {
  const days = new Set<string>();
  runs.forEach((r) => {
    days.add(r.start_date_local.slice(0, 10));
  });

  // Longest streak by day
  const sortedDays = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDays) {
    if (prev) {
      const a = new Date(prev);
      const b = new Date(d);
      const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
      if (diff === 1) {
        run += 1;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  // Longest streak by week (consecutive ISO weeks with at least 1 activity)
  const weekKeys = new Set<string>();
  runs.forEach((r) => {
    const d = parseLocalDate(r.start_date_local);
    const ws = startOfWeek(d);
    weekKeys.add(ymd(ws));
  });
  const sortedWeeks = Array.from(weekKeys).sort();
  let longestWeeks = 0;
  let runW = 0;
  let prevW: string | null = null;
  for (const w of sortedWeeks) {
    if (prevW) {
      const a = new Date(prevW);
      const b = new Date(w);
      const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
      if (diff === 7) runW += 1;
      else runW = 1;
    } else {
      runW = 1;
    }
    longestWeeks = Math.max(longestWeeks, runW);
    prevW = w;
  }

  // Current streak — count back from today (or yesterday if today missing)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let current = 0;
  let cursor = new Date(today);
  // If today has no activity, start counting from yesterday.
  if (!days.has(ymd(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(ymd(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // recentDays — last 7 days
  const recentDays: StreakInfo['recentDays'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    recentDays.push({
      date: d,
      active: days.has(ymd(d)),
      isToday: i === 0,
    });
  }

  return { current, longest, longestWeeks, recentDays };
};

export interface PersonalBests {
  fiveK: number | null; // seconds
  tenK: number | null;
  half: number | null;
  full: number | null;
}

// Approximate PRs: minimum total time among runs whose distance is close to the target.
export const computePersonalBests = (runs: Activity[]): PersonalBests => {
  let fiveK: number | null = null;
  let tenK: number | null = null;
  let half: number | null = null;
  let full: number | null = null;

  const updateBest = (cur: number | null, value: number): number | null =>
    cur === null || value < cur ? value : cur;

  for (const r of runs) {
    if (r.type !== 'Run') continue;
    const distKm = (r.distance || 0) / 1000;
    const seconds = convertMovingTime2Sec(r.moving_time);
    if (!seconds || !distKm) continue;
    // Reject corrupt source records beyond any credible human running speed.
    if (r.distance / seconds > 8.33) continue;

    // Scaled time for shorter benchmark distances (extrapolate at average pace).
    if (distKm >= 5) {
      const t = (seconds / distKm) * 5;
      fiveK = updateBest(fiveK, t);
    }
    if (distKm >= 10) {
      const t = (seconds / distKm) * 10;
      tenK = updateBest(tenK, t);
    }
    // Half marathon: real race times only (20.5-23km)
    if (distKm >= 20.5 && distKm <= 23.5) {
      half = updateBest(half, seconds);
    }
    // Full marathon: real race times only (>=41km)
    if (distKm >= 41 && distKm <= 50) {
      full = updateBest(full, seconds);
    }
  }
  return { fiveK, tenK, half, full };
};

export const formatHms = (totalSeconds: number | null): string => {
  if (totalSeconds === null) return '—';
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${pad2(m)}:${pad2(sec)}`;
  }
  return `${m}:${pad2(sec)}`;
};

// "1234.5h" or "9.1h" — pretty time for cards
export const formatHoursShort = (totalSeconds: number): string => {
  const hours = totalSeconds / 3600;
  if (hours >= 100) return `${hours.toFixed(0)}h`;
  return `${hours.toFixed(1)}h`;
};
