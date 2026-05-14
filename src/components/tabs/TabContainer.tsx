import { PlaceholderTab } from '@/components/tabs/PlaceholderTab';
import { FitnessTab } from '@/components/tabs/FitnessTab';
import { useUIContext } from '@/context/AppContext';

export function TabContainer() {
  const { activeTab } = useUIContext();

  return (
    <main key={activeTab} className="flex-1 overflow-y-auto w-full custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
      {activeTab === 'home' && <PlaceholderTab title="Главная" />}
      {activeTab === 'fitness' && <FitnessTab />}
      {activeTab === 'cinema' && <PlaceholderTab title="Кино" />}
      {activeTab === 'profile' && <PlaceholderTab title="Профиль" />}
    </main>
  );
}
