import { HomeTab } from '@/components/tabs/HomeTab';
import { FitnessTab } from '@/components/tabs/FitnessTab';
import { CinemaTab } from '@/components/tabs/CinemaTab';
import { ProfileTab } from '@/components/tabs/ProfileTab';
import { useUIContext } from '@/context/AppContext';

export function TabContainer() {
  const { activeTab } = useUIContext();

  return (
    <main key={activeTab} className="flex-1 overflow-y-auto w-full custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
      {activeTab === 'home' && <HomeTab />}
      {activeTab === 'fitness' && <FitnessTab />}
      {activeTab === 'cinema' && <CinemaTab />}
      {activeTab === 'profile' && <ProfileTab />}
    </main>
  );
}
