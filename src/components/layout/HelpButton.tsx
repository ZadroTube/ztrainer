import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

interface HelpButtonProps {
  /** Brand name shown in the modal header (e.g. "ZTrainer"). */
  brand: string;
  /** Modal title (e.g. "Как пользоваться"). */
  title?: string;
  /** Markdown content explaining the section. */
  content: string;
  /** Accent color for the border glow. */
  accent?: 'cyan' | 'magenta' | 'purple';
}

const accentBorder: Record<string, string> = {
  cyan: 'border-cyan-500/30',
  magenta: 'border-magenta-500/30',
  purple: 'border-purple-500/30',
};

export function HelpButton({ brand, title = 'Как пользоваться', content, accent = 'cyan' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors active:scale-90"
        aria-label={title}
        title={title}
      >
        <HelpCircle className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className={`w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border ${accentBorder[accent]} modal-sheet-tall overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
              <div>
                <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
                  {brand}
                </div>
                <h3 className="text-base font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
              <div
                className="prose-announcement text-sm text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
