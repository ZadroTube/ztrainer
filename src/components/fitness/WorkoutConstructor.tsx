import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAppContext } from '../../context/AppContext';
import { BaseExercise } from '../../types';
import { Search, Plus, Trash2, Dumbbell, Edit2, X } from 'lucide-react';
import { cn } from '../../lib/utils';


export function WorkoutConstructor() {
  const { exerciseDb, addExerciseToDb, updateExerciseInDb, deleteExerciseFromDb, selectedDate, plannedWorkouts, addExerciseToPlan, removeExerciseFromPlan } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    targetMuscleGroup: '',
    defaultSets: 3,
    defaultReps: 10,
    defaultRestTimeSeconds: 60,
    defaultWeightKg: '' as string | number,
  });

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const todaysPlan = plannedWorkouts[dateStr] || [];

  const filteredDb = exerciseDb.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ex.targetMuscleGroup && ex.targetMuscleGroup.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setExerciseForm({ name: '', targetMuscleGroup: '', defaultSets: 3, defaultReps: 10, defaultRestTimeSeconds: 60, defaultWeightKg: '' });
    setEditingExerciseId(null);
    setIsCreating(false);
  };

  const handleCreateOrUpdateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseForm.name.trim()) return;

    const w = exerciseForm.defaultWeightKg;
    const exerciseData: Omit<BaseExercise, 'id'> = {
      name: exerciseForm.name.trim(),
      targetMuscleGroup: exerciseForm.targetMuscleGroup.trim() || undefined,
      defaultSets: Number(exerciseForm.defaultSets) || undefined,
      defaultReps: Number(exerciseForm.defaultReps) || undefined,
      defaultRestTimeSeconds: Number(exerciseForm.defaultRestTimeSeconds) || undefined,
      defaultWeightKg: w !== '' && w !== undefined && Number(w) > 0 ? Number(w) : undefined,
    };

    if (editingExerciseId) {
      updateExerciseInDb(editingExerciseId, exerciseData);
    } else {
      addExerciseToDb(exerciseData);
    }

    resetForm();
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEdit = (ex: BaseExercise) => {
    setEditingExerciseId(ex.id);
    setExerciseForm({
      name: ex.name,
      targetMuscleGroup: ex.targetMuscleGroup || '',
      defaultSets: ex.defaultSets ?? 3,
      defaultReps: ex.defaultReps ?? 10,
      defaultRestTimeSeconds: ex.defaultRestTimeSeconds ?? 60,
      defaultWeightKg: ex.defaultWeightKg ?? '',
    });
    setIsCreating(true);
  };

  const handleAddToPlan = (exercise: BaseExercise) => {
    addExerciseToPlan(dateStr, exercise, exercise.defaultSets || 3, exercise.defaultReps || 10, exercise.defaultRestTimeSeconds || 60);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Current Plan Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h2 className="text-lg font-bold mb-3 flex items-center justify-between text-purple-400">
          План на день
          <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {todaysPlan.length} упр.
          </span>
        </h2>
        
        {todaysPlan.length === 0 ? (
          <p className="text-slate-500 text-sm italic text-center py-4 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
            План пуст. Добавьте упражнения из базы.
          </p>
        ) : (
          <div className="space-y-2">
            {todaysPlan.map((ex, idx) => (
              <div key={ex.workoutId} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div>
                  <div className="font-medium text-slate-200 text-sm">
                    {idx + 1}. {ex.name}
                  </div>
                  <div className="text-xs text-purple-400 mt-1">
                    {ex.sets} подходов × {ex.reps} повторений{ex.weightKg ? ` • ${ex.weightKg} кг` : ''}
                  </div>
                </div>
                <button 
                  onClick={() => removeExerciseFromPlan(dateStr, ex.workoutId)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          База упражнений
        </h2>

        {/* Search & Add New Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Поиск упражнений..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all custom-scrollbar"
            />
          </div>
          <button 
            onClick={isCreating ? resetForm : startCreate}
            className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* Create / Edit Form */}
        {isCreating && (
          <form onSubmit={handleCreateOrUpdateExercise} className="bg-slate-800/80 p-4 rounded-2xl border border-cyan-500/30 space-y-3 animate-in slide-in-from-top-2 fade-in">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-cyan-400">{editingExerciseId ? 'Редактировать' : 'Новое упражнение'}</h3>
            </div>
            <input 
              type="text" 
              required
              placeholder="Название упражнения" 
              value={exerciseForm.name}
              onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />
            <input 
              type="text" 
              placeholder="Группа мышц (опционально)" 
              value={exerciseForm.targetMuscleGroup}
              onChange={(e) => setExerciseForm({ ...exerciseForm, targetMuscleGroup: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Подходов</label>
                <input
                  type="number" min="1"
                  value={exerciseForm.defaultSets}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultSets: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Повторений</label>
                <input
                  type="number" min="1"
                  value={exerciseForm.defaultReps}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultReps: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Вес (кг)</label>
                <input
                  type="number" step="0.5" min="0"
                  placeholder="Без веса"
                  value={exerciseForm.defaultWeightKg}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultWeightKg: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Отдых (сек)</label>
                <input
                  type="number" step="10" min="0"
                  value={exerciseForm.defaultRestTimeSeconds}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultRestTimeSeconds: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button 
                type="submit"
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors whitespace-nowrap"
              >
                {editingExerciseId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        <div className="grid grid-cols-1 gap-2">
          {filteredDb.map(ex => (
            <div key={ex.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div>
                <h3 className="text-sm font-medium text-slate-200">{ex.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {ex.targetMuscleGroup && (
                    <span className="text-[10px] text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full inline-block">
                      {ex.targetMuscleGroup}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {ex.defaultSets || 3}x{ex.defaultReps || 10}{ex.defaultWeightKg ? ` • ${ex.defaultWeightKg} кг` : ''} • {ex.defaultRestTimeSeconds || 60}с
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => startEdit(ex)}
                  className="p-2 text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteExerciseFromDb(ex.id)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleAddToPlan(ex)}
                  className="p-2 text-cyan-400 hover:bg-cyan-500/20 bg-cyan-500/10 rounded-lg transition-colors ml-1"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {filteredDb.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Ничего не найдено
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
