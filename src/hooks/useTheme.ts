import { useState, useEffect, useCallback } from 'react';
import { MAP_TILE_STYLE_DARK } from '@/utils/const';

export type Theme = 'dark';

// Custom event name for theme changes (kept for compatibility)
export const THEME_CHANGE_EVENT = 'theme-change';

/**
 * Returns the dark map style (only dark theme is supported)
 */
export const getMapThemeFromCurrentTheme = (_theme: Theme): string => {
  return MAP_TILE_STYLE_DARK;
};

/**
 * Hook for managing map theme — always dark
 */
export const useMapTheme = () => {
  return MAP_TILE_STYLE_DARK;
};

/**
 * Main theme hook — dark only, no toggle
 */
export const useTheme = () => {
  const [theme] = useState<Theme>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  return {
    theme,
    setTheme: useCallback(() => {}, []),
  };
};

/**
 * Hook to trigger re-render when theme changes — kept for compatibility
 */
export const useThemeChangeCounter = () => {
  const [counter] = useState(0);
  return counter;
};
