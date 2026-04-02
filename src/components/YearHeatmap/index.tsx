import { lazy, Suspense, useEffect, useMemo } from 'react';
import { githubYearStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { initSvgColorAdjustments } from '@/utils/colorUtils';

interface IYearHeatmapProps {
  year: string;
}

const YearHeatmap = ({ year }: IYearHeatmapProps) => {
  const SvgComponent = useMemo(
    () => lazy(() => loadSvgComponent(githubYearStats, `./github_${year}.svg`)),
    [year]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      initSvgColorAdjustments();
    }, 100);
    return () => clearTimeout(timer);
  }, [year]);

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--color-activity-card)] p-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <SvgComponent className="github-svg h-auto w-full" />
      </Suspense>
    </div>
  );
};

export default YearHeatmap;
