import React, { Suspense } from 'react';
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

  return (
    <main key={activeTab} className="flex-1 overflow-y-auto w-full custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
      <Suspense
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-slate-950/20 text-cyan-400">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        }
      >
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'fitness' && <FitnessTab />}
        {activeTab === 'cinema' && <CinemaTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </Suspense>
    </main>
  );
}
