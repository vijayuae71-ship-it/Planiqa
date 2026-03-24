import { useState, useEffect } from 'react';

export interface Responsive {
  isMobile: boolean;   // < 768px
  isTablet: boolean;   // 768-1024px
  isDesktop: boolean;  // > 1024px
  width: number;
}

export const useResponsive = (): Responsive => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width <= 1024,
    isDesktop: width > 1024,
    width,
  };
};
