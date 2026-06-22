export type DashboardActivityType = 'Run' | 'Ride' | 'Hike';

export const DASHBOARD_ACTIVITY_TYPES: DashboardActivityType[] = [
  'Run',
  'Ride',
  'Hike',
];

export const ACTIVITY_TYPE_COLORS: Record<DashboardActivityType, string> = {
  Run: '#ff9e3f',
  Ride: '#5fb7e6',
  Hike: '#6bcb77',
};

export const normalizeDashboardActivityType = (
  type: string
): DashboardActivityType | null => {
  if (type === 'Run') return 'Run';
  if (type === 'Ride') return 'Ride';
  if (type === 'Hike' || type === 'Walk') return 'Hike';
  return null;
};
