import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useUIContext } from '@/context/AppContext';

const HomeTab = React.lazy(() =>
  import('@/components/tabs/HomeTab').then((m) => ({ default: m.HomeTab })),
);
const FitnessTab = React.lazy(() =>
  import('@/components/tabs/FitnessTab').then((m) => ({ default: m.FitnessTab })),
);
const CinemaTab = React.lazy(() =>
  import('@/components/tabs/CinemaTab').then((m) => ({ default: m.CinemaTab })),
);
const ProfileTab = React.lazy(() =>
  import('@/components/tabs/ProfileTab').then((m) => ({ default: m.ProfileTab })),
);

export function TabContainer() {
  const { activeTab } = useUIContext();
  const mainRef = useRef<HTMLDivElement>(null);

  // Track which tabs have been visited (rendered at least once) to preserve lazy-loading benefits.
  const [visited, setVisited] = useState<Record<string, boolean>>({
    home: activeTab === 'home',
    fitness: activeTab === 'fitness',
    cinema: activeTab === 'cinema',
    profile: activeTab === 'profile',
  });

  useEffect(() => {
    setVisited((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  // Reset scroll position to top when active tab changes, simulating a fresh navigation.
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <main
      ref={mainRef}
      className="flex-1 overflow-y-auto w-full custom-scrollbar relative"
    >
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-slate-950/20 text-cyan-400">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        }
      >
        <div className={activeTab === 'home' ? 'animate-in fade-in duration-300' : 'hidden'}>
          {visited.home && <HomeTab />}
        </div>
        <div className={activeTab === 'fitness' ? 'animate-in fade-in duration-300' : 'hidden'}>
          {visited.fitness && <FitnessTab />}
        </div>
        <div className={activeTab === 'cinema' ? 'animate-in fade-in duration-300' : 'hidden'}>
          {visited.cinema && <CinemaTab />}
        </div>
        <div className={activeTab === 'profile' ? 'animate-in fade-in duration-300' : 'hidden'}>
          {visited.profile && <ProfileTab />}
        </div>
      </Suspense>
    </main>
  );
}

