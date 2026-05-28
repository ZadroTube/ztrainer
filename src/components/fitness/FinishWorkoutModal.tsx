import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinishWorkoutModalProps {
  onClose: () => void;
  onSave: (rating: number | undefined, notes: string) => void;
}

export function FinishWorkoutModal({ onClose, onSave }: FinishWorkoutModalProps) {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Тренировка завершена!</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Оцени тренировку</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={cn(
                    'p-2 rounded-xl transition-all',
                    rating && rating >= star
                      ? 'text-yellow-400 bg-yellow-400/10 scale-110'
                      : 'text-slate-500 hover:text-yellow-400/50'
                  )}
                >
                  <Star className={cn('w-8 h-8', rating && rating >= star && 'fill-current')} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Самочувствие и заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Как прошла тренировка? Есть ли жалобы или пожелания на будущее?"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-h-[100px] resize-none"
            />
          </div>

          <button
            onClick={() => onSave(rating, notes)}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            Сохранить в дневник
          </button>
        </div>
      </div>
    </div>
  );
}
