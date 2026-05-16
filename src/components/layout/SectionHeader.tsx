import { type ReactNode } from 'react';

interface SectionHeaderProps {
  /** Brand name (gradient-styled small caps), e.g. "ZTrainer", "CinemaZ", "ZHub". */
  brand: string;
  /** Section title displayed below the brand, e.g. "Тренировки", "Кино". */
  title: string;
  /** Optional content (timer, action button, etc.) on the right side of the header. */
  rightSlot?: ReactNode;
}

/**
 * Unified section header used across every tab. The gradient style for the
 * brand name is the visual signature of the app — keep it identical so the
 * tabs feel like one product.
 */
export function SectionHeader({ brand, title, rightSlot }: SectionHeaderProps) {
  return (
    <header className="px-2 pt-6 pb-2 flex justify-between items-center flex-shrink-0">
      <div className="flex flex-col">
        <span className="text-xs bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
          {brand}
        </span>
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
      {rightSlot}
    </header>
  );
}
