import { Construction } from 'lucide-react';

export function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] text-center px-4">
      <div className="w-24 h-24 mb-6 rounded-full bg-slate-800/80 border border-magenta-500/50 shadow-[0_0_30px_rgba(217,70,239,0.3)] flex items-center justify-center animate-pulse">
        <Construction className="w-10 h-10 text-magenta-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2 tracking-wide">{title}</h1>
      <p className="text-slate-400 max-w-xs">{title} находится в стадии активной разработки.</p>
    </div>
  );
}
