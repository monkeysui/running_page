export type DashboardActivityType = 'Run' | 'Ride' | 'Hike' | 'Swim';

export const DASHBOARD_ACTIVITY_TYPES: DashboardActivityType[] = [
  'Run',
  'Ride',
  'Hike',
  'Swim',
];

export const ACTIVITY_TYPE_COLORS: Record<DashboardActivityType, string> = {
  Run: '#ff9e3f',
  Ride: '#5fb7e6',
  Hike: '#6bcb77',
  Swim: '#a78bfa',
};

export const normalizeDashboardActivityType = (
  type: string
): DashboardActivityType | null => {
  const normalized = type.toLowerCase();
  if (normalized === 'run' || normalized === 'running') return 'Run';
  if (normalized === 'ride' || normalized === 'cycling') return 'Ride';
  if (normalized === 'swim' || normalized === 'swimming') return 'Swim';
  if (
    normalized === 'hike' ||
    normalized === 'hiking' ||
    normalized === 'walk' ||
    normalized === 'walking'
  ) {
    return 'Hike';
  }
  return null;
};
