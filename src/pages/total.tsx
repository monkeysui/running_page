import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import ActivityList from '@/components/ActivityList';
import activitiesData from '@/static/activities.json';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useTheme } from '@/hooks/useTheme';
import { M_TO_DIST, DIST_UNIT, Activity } from '@/utils/utils';

const convertTimeToSeconds = (time: string): number => {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

const SummaryPage = () => {
  const { siteTitle, description } = useSiteMetadata();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const seasonStats = useMemo(() => {
    const acts = activitiesData as Activity[];
    let totalDistance = 0;
    let totalHr = 0;
    let hrCount = 0;
    let totalSeconds = 0;
    const years = new Set<string>();
    acts.forEach((a) => {
      totalDistance += a.distance || 0;
      if (a.average_heartrate) {
        totalHr += a.average_heartrate;
        hrCount++;
      }
      totalSeconds += convertTimeToSeconds(a.moving_time || '00:00:00');
      years.add(a.start_date_local.slice(0, 4));
    });
    const distanceKm = totalDistance / M_TO_DIST;
    const avgHr = hrCount > 0 ? Math.round(totalHr / hrCount) : 0;
    const totalHours = totalSeconds / 3600;
    const tier =
      distanceKm > 2000
        ? 'Elite'
        : distanceKm > 1000
          ? 'Advanced'
          : distanceKm > 500
            ? 'Consistent'
            : distanceKm > 100
              ? 'Starter'
              : 'Rookie';
    return {
      totalDistance: distanceKm,
      totalActivities: acts.length,
      avgHr,
      totalHours,
      yearsCount: years.size,
      tier,
    };
  }, []);

  return (
    <Layout>
      <Helmet>
        <html lang="en" data-theme={theme} />
        <title>Summary — {siteTitle}</title>
        <meta name="description" content={description} />
      </Helmet>

      {/* Hero */}
      <section className="mb-2 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1
            className="font-headline text-5xl font-extrabold uppercase italic leading-none tracking-tighter md:text-7xl"
            style={{ letterSpacing: '-0.04em' }}
          >
            Performance{' '}
            <span style={{ color: 'var(--color-brand)' }}>Pulse</span>
          </h1>
          <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
            High-fidelity breakdown by year / month / week / day. Tracking
            distance, pace, heart rate and volume peaks across{' '}
            <span
              style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
            >
              {seasonStats.yearsCount}
            </span>{' '}
            years.
          </p>
        </div>
      </section>

      {/* Activity list (filters + virtualized cards) */}
      <ActivityList />

      {/* Season footer stats */}
      <section
        className="mt-10 rounded-2xl border p-8"
        style={{
          backgroundColor: 'var(--color-surface-container-low)',
          borderColor:
            'color-mix(in srgb, var(--color-text-primary) 6%, transparent)',
        }}
      >
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <FooterStat
            value={seasonStats.totalDistance.toFixed(1)}
            label={`Total ${DIST_UNIT}`}
            accent
          />
          <FooterStat
            value={seasonStats.totalActivities.toString()}
            label="Total Activities"
          />
          <FooterStat
            value={
              seasonStats.avgHr > 0 ? seasonStats.avgHr.toString() : '—'
            }
            label="Avg Heart Rate"
          />
          <FooterStat
            value={seasonStats.tier}
            label="Activity Tier"
            accentColor="var(--color-accent-purple)"
          />
        </div>
      </section>
    </Layout>
  );
};

const FooterStat = ({
  value,
  label,
  accent,
  accentColor,
}: {
  value: string;
  label: string;
  accent?: boolean;
  accentColor?: string;
}) => (
  <div>
    <h4
      className="font-headline text-3xl font-extrabold tracking-tighter md:text-4xl"
      style={{
        color: accent
          ? 'var(--color-brand)'
          : accentColor || 'var(--color-text-primary)',
      }}
    >
      {value}
    </h4>
    <p className="text-muted mt-1 text-[10px] font-bold uppercase tracking-[0.18em]">
      {label}
    </p>
  </div>
);

export default SummaryPage;
