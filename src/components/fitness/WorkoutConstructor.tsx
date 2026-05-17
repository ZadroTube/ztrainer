import { useState, useEffect, useRef, type FormEvent } from 'react';
import { format } from 'date-fns';
import {
  useWorkoutData, useUIContext,
  subscribeHistoryCache, getHistoryCacheEpoch,
} from '@/context/AppContext';
import { BaseExercise } from '@/types';
import {
  Search, Plus, Trash2, Dumbbell, Edit2, X, TrendingUp,
  CalendarDays, MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchExerciseHistory } from '@/lib/supabase';

type HistoryRow = { plan_date: string; weight_kg: number | null; sets: number; reps: number };
type Mode = 'day' | 'library';

/**
 * Builder. Iteration 3 layout:
 *   - Two modes at the top: "План на день" / "База упражнений"
 *   - In "Day" mode: the planned exercises with inline editing (sets/reps/kg)
 *     and a "+ Добавить из базы" call-to-action that switches to library.
 *   - In "Library" mode: search + add-new + the catalog.
 *     Each library card has ONE primary action ("+ В план") and a context menu
 *     (history / edit / delete) — instead of four equally-prominent buttons.
 */
export function WorkoutConstructor() {
  const {
    exerciseDb, addExerciseToDb, updateExerciseInDb, deleteExerciseFromDb,
    plannedWorkouts, addExerciseToPlan, updatePlanExercise, removeExerciseFromPlan,
  } = useWorkoutData();
  const { selectedDate } = useUIContext();

  const [mode, setMode] = useState<Mode>('day');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [deletePlanConfirmId, setDeletePlanConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Per-component history cache, scoped to a particular cache epoch coming
  // from AppContext.
  const historyCacheRef = useRef<Map<string, HistoryRow[]>>(new Map());
  const cacheEpochRef = useRef<number>(getHistoryCacheEpoch());
  useEffect(() => {
    return subscribeHistoryCache((epoch) => {
      if (epoch !== cacheEpochRef.current) {
        cacheEpochRef.current = epoch;
        historyCacheRef.current.clear();
      }
    });
  }, []);

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

  const filteredDb = exerciseDb.filter(
    (ex) =>
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.targetMuscleGroup &&
        ex.targetMuscleGroup.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const resetForm = () => {
    setExerciseForm({
      name: '', targetMuscleGroup: '',
      defaultSets: 3, defaultReps: 10, defaultRestTimeSeconds: 60,
      defaultWeightKg: '',
    });
    setEditingExerciseId(null);
    setIsCreating(false);
  };

  const handleCreateOrUpdateExercise = (e: FormEvent) => {
    e.preventDefault();
    if (!exerciseForm.name.trim()) return;
    const w = exerciseForm.defaultWeightKg;
    const exerciseData: Omit<BaseExercise, 'id'> = {
      name: exerciseForm.name.trim(),
      targetMuscleGroup: exerciseForm.targetMuscleGroup.trim() || undefined,
      defaultSets: Number(exerciseForm.defaultSets) || undefined,
      defaultReps: Number(exerciseForm.defaultReps) || undefined,
      defaultRestTimeSeconds: Number(exerciseForm.defaultRestTimeSeconds) || undefined,
      defaultWeightKg:
        w !== '' && w !== undefined && !isNaN(Number(w)) && Number(w) >= 0
          ? Number(w)
          : undefined,
    };
    if (editingExerciseId) updateExerciseInDb(editingExerciseId, exerciseData);
    else addExerciseToDb(exerciseData);
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
      defaultWeightKg: ex.defaultWeightKg != null ? ex.defaultWeightKg : '',
    });
    setIsCreating(true);
    setOpenMenuId(null);
  };

  const handleAddToPlan = (exercise: BaseExercise) => {
    addExerciseToPlan(
      dateStr,
      exercise,
      exercise.defaultSets || 3,
      exercise.defaultReps || 10,
      exercise.defaultRestTimeSeconds || 60,
    );
  };

  const toggleHistory = async (exId: string) => {
    setOpenMenuId(null);
    if (historyId === exId) {
      setHistoryId(null);
      return;
    }
    setHistoryId(exId);
    const cached = historyCacheRef.current.get(exId);
    if (cached) {
      setHistoryData(cached);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    const epochAtRequest = cacheEpochRef.current;
    const data = await fetchExerciseHistory(exId);
    const typed = data as HistoryRow[];
    if (epochAtRequest === cacheEpochRef.current) {
      historyCacheRef.current.set(exId, typed);
    }
    setHistoryData(typed);
    setHistoryLoading(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Mode switch */}
      <div className="flex gap-2">
        <ModeButton
          active={mode === 'day'}
          onClick={() => setMode('day')}
          icon={<CalendarDays className="w-4 h-4" />}
          label="План на день"
          count={todaysPlan.length}
          accent="purple"
        />
        <ModeButton
          active={mode === 'library'}
          onClick={() => setMode('library')}
          icon={<Dumbbell className="w-4 h-4" />}
          label="База"
          count={exerciseDb.length}
          accent="cyan"
        />
      </div>

      {mode === 'day' ? (
        <>
          {todaysPlan.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-700/60 rounded-2xl p-8 text-center space-y-3">
              <p className="text-slate-400 text-sm">План на этот день пока пуст.</p>
              <button
                onClick={() => setMode('library')}
                className="active:scale-95 px-5 py-2.5 bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 rounded-xl font-medium text-sm transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Добавить из базы
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysPlan.map((ex, idx) => (
                <div
                  key={ex.workoutId}
                  className="glass-perf p-3 rounded-xl border border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-200 text-sm truncate">
                      {idx + 1}. {ex.name}
                    </div>
                    <button
                      onClick={() => {
                        if (deletePlanConfirmId === ex.workoutId) {
                          removeExerciseFromPlan(dateStr, ex.workoutId);
                          setDeletePlanConfirmId(null);
                        } else {
                          setDeletePlanConfirmId(ex.workoutId);
                          setTimeout(() => setDeletePlanConfirmId(null), 3000);
                        }
                      }}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        deletePlanConfirmId === ex.workoutId
                          ? 'text-red-400 bg-red-400/10'
                          : 'text-slate-500 hover:text-red-400 hover:bg-red-400/10',
                      )}
                      title={
                        deletePlanConfirmId === ex.workoutId
                          ? 'Нажмите ещё раз для удаления'
                          : 'Удалить'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <PlanField label="Подх." value={ex.sets} onChange={(v) => updatePlanExercise(dateStr, ex.workoutId, { sets: v })} />
                    <PlanField label="Повт." value={ex.reps} onChange={(v) => updatePlanExercise(dateStr, ex.workoutId, { reps: v })} />
                    <PlanField
                      label="кг"
                      value={ex.weightKg ?? ''}
                      placeholder="-"
                      step={0.5}
                      onChange={(v) =>
                        updatePlanExercise(dateStr, ex.workoutId, { weightKg: v === '' ? undefined : Number(v) })
                      }
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setMode('library')}
                className="active:scale-95 w-full mt-1 px-4 py-2.5 rounded-xl border border-dashed border-slate-700/60 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 text-sm font-medium transition-all inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Добавить ещё упражнение
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Search + add-new toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Поиск упражнений..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
            </div>
            <button
              onClick={isCreating ? resetForm : startCreate}
              className={cn(
                'p-3 rounded-xl transition-colors',
                isCreating
                  ? 'bg-slate-800 border border-slate-700 text-slate-300'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]',
              )}
              title={isCreating ? 'Закрыть форму' : 'Создать упражнение'}
            >
              {isCreating ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          {isCreating && (
            <form
              onSubmit={handleCreateOrUpdateExercise}
              className="glass-perf p-4 rounded-2xl border border-cyan-500/30 space-y-3 animate-in slide-in-from-top-2 fade-in"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-cyan-300">
                  {editingExerciseId ? 'Редактировать' : 'Новое упражнение'}
                </h3>
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
                onChange={(e) =>
                  setExerciseForm({ ...exerciseForm, targetMuscleGroup: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <FormField
                  label="Подходов"
                  type="number"
                  min={1}
                  value={exerciseForm.defaultSets}
                  onChange={(v) =>
                    setExerciseForm({ ...exerciseForm, defaultSets: parseInt(v) || 1 })
                  }
                />
                <FormField
                  label="Повторений"
                  type="number"
                  min={1}
                  value={exerciseForm.defaultReps}
                  onChange={(v) =>
                    setExerciseForm({ ...exerciseForm, defaultReps: parseInt(v) || 1 })
                  }
                />
                <FormField
                  label="Вес (кг)"
                  type="number"
                  step={0.5}
                  min={0}
                  placeholder="Без веса"
                  value={exerciseForm.defaultWeightKg}
                  onChange={(v) => setExerciseForm({ ...exerciseForm, defaultWeightKg: v })}
                />
                <FormField
                  label="Отдых (сек)"
                  type="number"
                  step={10}
                  min={0}
                  value={exerciseForm.defaultRestTimeSeconds}
                  onChange={(v) =>
                    setExerciseForm({ ...exerciseForm, defaultRestTimeSeconds: parseInt(v) || 0 })
                  }
                />
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="submit"
                  className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
                >
                  {editingExerciseId ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          )}

          {/* Library list */}
          <div className="space-y-2">
            {filteredDb.map((ex) => (
              <LibraryRow
                key={ex.id}
                ex={ex}
                isMenuOpen={openMenuId === ex.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === ex.id ? null : ex.id)}
                onAddToPlan={() => handleAddToPlan(ex)}
                onEdit={() => startEdit(ex)}
                onShowHistory={() => toggleHistory(ex.id)}
                deleteConfirm={deleteConfirmId === ex.id}
                onDelete={() => {
                  if (deleteConfirmId === ex.id) {
                    deleteExerciseFromDb(ex.id);
                    setDeleteConfirmId(null);
                    setOpenMenuId(null);
                  } else {
                    setDeleteConfirmId(ex.id);
                    setTimeout(() => setDeleteConfirmId(null), 3000);
                  }
                }}
                historyOpen={historyId === ex.id}
                historyLoading={historyLoading}
                historyData={historyId === ex.id ? historyData : []}
              />
            ))}
            {filteredDb.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">Ничего не найдено</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({
  active, onClick, icon, label, count, accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: 'cyan' | 'purple';
}) {
  const accentClass =
    accent === 'cyan'
      ? 'border-cyan-500/30 text-cyan-300'
      : 'border-purple-500/30 text-purple-300';
  return (
    <button
      onClick={onClick}
      className={cn(
        'active:scale-95 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
        active
          ? `bg-slate-800 border ${accentClass} shadow-[0_4px_10px_rgba(0,0,0,0.5)]`
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass-perf',
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] tabular-nums',
          active ? 'bg-slate-700/70 text-slate-200' : 'bg-slate-800 text-slate-500',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PlanField({
  label, value, onChange, placeholder, step = 1,
}: {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-slate-500">{label}</label>
      <input
        type="number"
        step={step}
        min={step < 1 ? 0 : 1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange('');
          const n = step < 1 ? Number(raw) : parseInt(raw);
          if (!isNaN(n) && n >= 0) onChange(n);
        }}
        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-purple-300 focus:outline-none focus:border-purple-500 placeholder:text-slate-600 tabular-nums"
      />
    </div>
  );
}

function FormField({
  label, value, onChange, type = 'text', min, step, placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  min?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
      />
    </div>
  );
}

function LibraryRow({
  ex, isMenuOpen, onToggleMenu, onAddToPlan, onEdit, onShowHistory,
  deleteConfirm, onDelete,
  historyOpen, historyLoading, historyData,
}: {
  ex: BaseExercise;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onAddToPlan: () => void;
  onEdit: () => void;
  onShowHistory: () => void;
  deleteConfirm: boolean;
  onDelete: () => void;
  historyOpen: boolean;
  historyLoading: boolean;
  historyData: HistoryRow[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
        <button
          onClick={onAddToPlan}
          className="text-left flex-1 min-w-0 group"
          title="Добавить в план дня"
        >
          <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-200 transition-colors">
            {ex.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {ex.targetMuscleGroup && (
              <span className="text-[10px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-full inline-block">
                {ex.targetMuscleGroup}
              </span>
            )}
            <span className="text-[10px] text-slate-500 tabular-nums">
              {ex.defaultSets || 3}×{ex.defaultReps || 10}
              {ex.defaultWeightKg ? ` · ${ex.defaultWeightKg} кг` : ''} ·{' '}
              {ex.defaultRestTimeSeconds || 60}с
            </span>
          </div>
        </button>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={onAddToPlan}
            className="p-2 text-cyan-300 hover:bg-cyan-500/20 bg-cyan-500/10 rounded-lg transition-colors"
            title="Добавить в план"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleMenu}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isMenuOpen
                ? 'text-cyan-300 bg-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
            )}
            title="Действия"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mt-1 mr-1 flex justify-end gap-1 animate-in slide-in-from-top-1 fade-in">
          <MenuItem onClick={onShowHistory} icon={<TrendingUp className="w-3.5 h-3.5" />} label="История" />
          <MenuItem onClick={onEdit} icon={<Edit2 className="w-3.5 h-3.5" />} label="Редакт." />
          <MenuItem
            onClick={onDelete}
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label={deleteConfirm ? 'Точно?' : 'Удалить'}
            danger={deleteConfirm}
          />
        </div>
      )}

      {historyOpen && (
        <div className="mt-2 glass-perf rounded-xl p-3 border border-slate-700/50 animate-in slide-in-from-top-2 fade-in">
          <h4 className="text-xs font-bold text-cyan-300 mb-2 uppercase tracking-wider">
            История
          </h4>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              Загрузка...
            </div>
          ) : historyData.length === 0 ? (
            <p className="text-slate-500 text-xs">Нет данных</p>
          ) : (
            <div className="space-y-1.5">
              {historyData.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{h.plan_date}</span>
                  <span className="text-slate-400 tabular-nums">
                    {h.sets}×{h.reps}
                    {h.weight_kg ? ` · ${h.weight_kg} кг` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick, icon, label, danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'active:scale-95 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5',
        danger
          ? 'bg-red-500/15 border-red-500/40 text-red-300'
          : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
