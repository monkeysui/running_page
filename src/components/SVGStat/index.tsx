import { lazy, Suspense, useEffect } from 'react';
import { totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { initSvgColorAdjustments } from '@/utils/colorUtils';

const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

const SVGStat = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      initSvgColorAdjustments();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="svgStat">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <GridSvg className="grid-svg mt-4 h-auto w-full" />
      </Suspense>
    </div>
  );
};

export default SVGStat;
