import { MotionConfig, motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

const uiTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const AppMotionProvider = ({ children }: { children: ReactNode }) => (
  <MotionConfig reducedMotion="user" transition={uiTransition}>
    {children}
  </MotionConfig>
);

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      className="page-motion-shell min-w-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={uiTransition}
    >
      {children}
    </motion.div>
  );
};

export const RouteLoadingState = () => (
  <div className="route-loading-state" role="status" aria-live="polite" aria-label="Loading page">
    <span className="route-loading-state__bar" />
    <span className="route-loading-state__bar route-loading-state__bar--short" />
    <span className="sr-only">Loading page</span>
  </div>
);
