import { Film } from 'lucide-react';
import { SectionHeader } from '@/components/layout/SectionHeader';

/**
 * Cinema (CinemaZ) tab. Full implementation lands in a later stage —
 * this scaffold reserves the route and brand identity in the bottom nav.
 */
export function CinemaTab() {
  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300">
      <SectionHeader brand="CinemaZ" title="Кино" />

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-24 h-24 mb-6 rounded-full bg-slate-800/80 border border-magenta-500/40 shadow-[0_0_30px_rgba(217,70,239,0.25)] flex items-center justify-center">
          <Film className="w-10 h-10 text-magenta-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Скоро тут будет уютная кинотека</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          Список на потом, просмотренное, рекомендации и оценки — всё в одном месте.
        </p>
      </div>
    </div>
  );
}
