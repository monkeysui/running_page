import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { DIST_UNIT } from '@/utils/utils';
import {
  ACTIVITY_TYPE_COLORS,
  DASHBOARD_ACTIVITY_TYPES,
  DashboardActivityType,
} from '@/utils/activityTypes';

interface ChartData {
  day: number;
  distance: number;
  Run: number;
  Ride: number;
  Hike: number;
  Swim: number;
}

interface ActivityChartProps {
  data: ChartData[];
  yAxisMax: number;
  yAxisTicks: number[];
  stackByType: boolean;
  activityType: DashboardActivityType | null;
}

const ActivityChart = ({
  data,
  yAxisMax,
  yAxisTicks,
  stackByType,
  activityType,
}: ActivityChartProps) => (
  <ResponsiveContainer>
    <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
      <CartesianGrid
        strokeDasharray="3 3"
        stroke="var(--color-run-row-hover-background)"
      />
      <XAxis dataKey="day" tick={{ fill: 'var(--color-run-table-thead)' }} />
      <YAxis
        label={{
          value: DIST_UNIT,
          angle: -90,
          position: 'insideLeft',
          fill: 'var(--color-run-table-thead)',
        }}
        domain={[0, yAxisMax]}
        ticks={yAxisTicks}
        tick={{ fill: 'var(--color-run-table-thead)' }}
      />
      <Tooltip
        formatter={(value) => `${value} ${DIST_UNIT}`}
        position={{ y: 0 }}
        wrapperStyle={{ pointerEvents: 'none', zIndex: 10 }}
        contentStyle={{
          backgroundColor: 'var(--color-run-row-hover-background)',
          border: '1px solid var(--color-run-row-hover-background)',
          color: 'var(--color-run-table-thead)',
          fontSize: 12,
          lineHeight: 1.25,
          padding: '6px 10px',
        }}
        itemStyle={{ padding: '1px 0' }}
        labelStyle={{ color: 'var(--color-primary)', marginBottom: 3 }}
      />
      {stackByType ? (
        DASHBOARD_ACTIVITY_TYPES.map((type) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="activity"
            fill={ACTIVITY_TYPE_COLORS[type]}
          />
        ))
      ) : (
        <Bar
          dataKey="distance"
          fill={
            activityType
              ? ACTIVITY_TYPE_COLORS[activityType]
              : 'var(--color-primary)'
          }
          minPointSize={2}
        />
      )}
    </BarChart>
  </ResponsiveContainer>
);

export default ActivityChart;
