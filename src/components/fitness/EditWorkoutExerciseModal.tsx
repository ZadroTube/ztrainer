import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WorkoutExercise } from '@/types';

interface EditWorkoutExerciseModalProps {
  exercise: WorkoutExercise;
  onClose: () => void;
  onSave: (updates: Partial<Pick<WorkoutExercise, 'sets' | 'reps' | 'durationSeconds' | 'weightKg'>>) => void;
}

export function EditWorkoutExerciseModal({ exercise, onClose, onSave }: EditWorkoutExerciseModalProps) {
  const [sets, setSets] = useState(exercise.sets?.toString() ?? '');
  const [reps, setReps] = useState(exercise.reps?.toString() ?? '');
  const [duration, setDuration] = useState(
    exercise.durationSeconds ? Math.floor(exercise.durationSeconds / 60).toString() : ''
  );
  const [weight, setWeight] = useState(exercise.weightKg?.toString() ?? '');

  const handleSave = () => {
    onSave({
      sets: sets === '' ? undefined : parseInt(sets, 10),
      reps: reps === '' ? undefined : parseInt(reps, 10),
      durationSeconds: duration === '' ? undefined : parseInt(duration, 10) * 60,
      weightKg: weight === '' ? undefined : parseFloat(weight),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white truncate pr-4">{exercise.name}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Подходы</label>
              <input
                type="number"
                value={sets}
                onChange={e => setSets(e.target.value)}
                placeholder="-"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
              />
            </div>
            {exercise.isTimeBased ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Минуты</label>
                <input
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="-"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Повторения</label>
                <input
                  type="number"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder="-"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Вес (кг)</label>
              <input
                type="number"
                step="0.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="Свой вес"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-cyan-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all mt-2"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
