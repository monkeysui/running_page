import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import ActivityList from '@/components/ActivityList';
import activitiesData from '@/static/activities.json';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useTheme } from '@/hooks/useTheme';
import type { Activity } from '@/utils/utils';

const SummaryPage = () => {
  const { siteTitle, description } = useSiteMetadata();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const yearsCount = useMemo(() => {
    const acts = activitiesData as Activity[];
    return new Set(acts.map((a) => a.start_date_local.slice(0, 4))).size;
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
            className="font-headline text-5xl leading-none font-extrabold tracking-tighter uppercase italic md:text-7xl"
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
              {yearsCount}
            </span>{' '}
            years.
          </p>
        </div>
      </section>

      {/* Activity list (filters + virtualized cards) */}
      <ActivityList />
    </Layout>
  );
};

export default SummaryPage;
