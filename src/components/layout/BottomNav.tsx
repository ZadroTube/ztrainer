import React from 'react';
import { Home, Dumbbell, Film, User } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { TabName } from '../../types';
import { cn } from '../../lib/utils';

interface NavItemProps {
  id: TabName;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItemProps[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'fitness', label: 'Тренировки', icon: Dumbbell },
  { id: 'cinema', label: 'Кино', icon: Film },
  { id: 'profile', label: 'Профиль', icon: User },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppContext();

  return (
    <nav className="absolute bottom-0 w-full glass border-t border-slate-700/50 flex justify-between px-6 pb-6 pt-3 z-20">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "active:scale-95 flex flex-col items-center transition-all duration-300",
              isActive ? "text-cyan-400" : "text-slate-400 opacity-40 hover:opacity-100"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] mt-1 font-medium tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
