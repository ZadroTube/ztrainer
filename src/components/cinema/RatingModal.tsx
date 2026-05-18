import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { setRating, type Movie } from '@/lib/cinema';

interface RatingModalProps {
  movie: Movie;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Modal for rating a watched movie. Saves both husband / wife ratings
 * separately so the kinoteka can show the couple's verdict.
 */
export function RatingModal({ movie, onClose, onSaved }: RatingModalProps) {
  const [husband, setHusband] = useState<number | null>(null);
  const [wife, setWife] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];
      if (husband) promises.push(setRating(movie.id, 'husband', husband));
      if (wife) promises.push(setRating(movie.id, 'wife', wife));
      await Promise.all(promises);
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 modal-sheet overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              CinemaZ
            </div>
            <h3 className="text-base font-bold text-white truncate max-w-[220px]">Оценить: {movie.title}</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-5 space-y-4">
          <RatingRow label="👨 Муж" value={husband} onChange={setHusband} accent="cyan" />
          <RatingRow label="👩 Жена" value={wife} onChange={setWife} accent="magenta" />

          <button
            onClick={save}
            disabled={saving || (!husband && !wife)}
            className="w-full active:scale-95 px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(6,182,212,0.3)] disabled:opacity-50 transition-all"
          >
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  accent: 'cyan' | 'magenta';
}) {
  const colorClass =
    accent === 'cyan'
      ? 'text-cyan-300 hover:text-cyan-200'
      : 'text-magenta-300 hover:text-magenta-200';
  return (
    <div>
      <div className="text-xs text-slate-300 mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`active:scale-90 transition-all ${value && n <= value ? colorClass : 'text-slate-600 hover:text-slate-400'}`}
          >
            <Star className={`w-7 h-7 ${value && n <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
