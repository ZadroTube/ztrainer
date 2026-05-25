import { useState } from 'react';
import { useUIContext } from '@/context/AppContext';
import { FitnessGoal, FitnessLevel, TrainingLocation } from '@/types';
import { Flame, Dumbbell, Zap, Trophy, MapPin, Check, ChevronLeft, ChevronRight, X, Clock, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FitnessOnboardingProps {
  onClose: () => void;
}

const GOALS: { id: FitnessGoal; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'lose_weight',
    label: 'Похудеть',
    desc: 'Снижение жировой массы и улучшение рельефа тела',
    icon: <Flame className="w-6 h-6" />,
    color: 'from-orange-500 to-red-500 text-orange-400'
  },
  {
    id: 'gain_muscle',
    label: 'Набрать массу',
    desc: 'Увеличение объемов, силы и плотности мышц',
    icon: <Dumbbell className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-600 text-cyan-400'
  },
  {
    id: 'endurance',
    label: 'Выносливость',
    desc: 'Укрепление сердца, выносливость и функциональность',
    icon: <Zap className="w-6 h-6" />,
    color: 'from-yellow-400 to-amber-500 text-yellow-400'
  },
  {
    id: 'general_fitness',
    label: 'Общая форма',
    desc: 'Поддержание тонуса, здоровья и энергии на каждый день',
    icon: <Trophy className="w-6 h-6" />,
    color: 'from-pink-500 to-rose-500 text-rose-400'
  }
];

const LOCATIONS: { id: TrainingLocation; label: string; emoji: string; desc: string }[] = [
  { id: 'gym', label: 'Зал', emoji: '🏋️', desc: 'Фитнес-клуб с полным набором тренажеров' },
  { id: 'outdoor', label: 'Уличная площадка', emoji: '🌳', desc: 'Турники, брусья, шведские стенки' },
  { id: 'home', label: 'Дома', emoji: '🏠', desc: 'Тренировки со своим весом или минимумом инвентаря' },
  { id: 'combined', label: 'Комбинированные варианты', emoji: '🔄', desc: 'Зал, дом и улица в разных сочетаниях' }
];

const LEVELS: { id: FitnessLevel; label: string; ru: string }[] = [
  { id: 'beginner', label: 'Beginner', ru: 'Новичок' },
  { id: 'intermediate', label: 'Intermediate', ru: 'Средний' },
  { id: 'advanced', label: 'Advanced', ru: 'Продвинутый' }
];

const POPULAR_EQUIPMENT = [
  { id: 'dumbbells', label: 'Гантели' },
  { id: 'barbell', label: 'Штанга' },
  { id: 'pullup_bar', label: 'Турник / Брусья' },
  { id: 'resistance_bands', label: 'Эспандеры / Резинки' },
  { id: 'trx', label: 'Петли TRX' },
  { id: 'jump_rope', label: 'Скакалка' },
  { id: 'mat', label: 'Коврик' }
];

export function FitnessOnboarding({ onClose }: FitnessOnboardingProps) {
  const { updateFitnessProfile, userProfile } = useUIContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [goal, setGoal] = useState<FitnessGoal | undefined>(userProfile?.fitness_goal);
  const [level, setLevel] = useState<FitnessLevel>(userProfile?.fitness_level || 'intermediate');
  const [location, setLocation] = useState<TrainingLocation | undefined>(userProfile?.training_location);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => {
    if (!userProfile?.equipment) return [];
    return userProfile.equipment.split(',').map(e => e.trim()).filter(e => POPULAR_EQUIPMENT.some(p => p.id === e));
  });
  const [customEquipment, setCustomEquipment] = useState<string>(() => {
    if (!userProfile?.equipment) return '';
    const parts = userProfile.equipment.split(',').map(e => e.trim());
    return parts.filter(e => !POPULAR_EQUIPMENT.some(p => p.id === e)).join(', ');
  });
  const [availableMinutes, setAvailableMinutes] = useState<number>(userProfile?.available_minutes || 60);
  const [gender, setGender] = useState<'male' | 'female' | undefined>(userProfile?.gender);
  const [birthYear, setBirthYear] = useState<string>(userProfile?.birth_year ? String(userProfile.birth_year) : '');

  const handleDismiss = () => {
    localStorage.setItem('fitness_onboarding_dismissed', 'true');
    onClose();
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    setLoading(false);
    // Prepare equipment string
    const equipmentList = [...selectedEquipment];
    if (customEquipment.trim()) {
      const customs = customEquipment.split(',').map(e => e.trim()).filter(e => e.length > 0);
      equipmentList.push(...customs);
    }
    const equipmentStr = equipmentList.join(', ');

    try {
      setLoading(true);
      await updateFitnessProfile({
        fitness_goal: goal,
        fitness_level: level,
        training_location: location,
        equipment: equipmentStr || undefined,
        available_minutes: availableMinutes,
        gender: gender || undefined,
        birth_year: birthYear ? parseInt(birthYear, 10) : undefined
      });
      localStorage.setItem('fitness_onboarding_dismissed', 'true');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Validation
  const isNextDisabled = () => {
    if (step === 1 && !goal) return true;
    if (step === 2 && !location) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 animate-in fade-in duration-200 p-0 sm:p-4">
      <div className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/20 max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 font-bold uppercase tracking-widest">
              Шаг {step} из 3
            </div>
            <h3 className="text-base font-bold text-white">Фитнес-профиль</h3>
          </div>
          <button 
            onClick={handleDismiss} 
            className="active:scale-95 text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Выбрать позже
          </button>
        </header>

        {/* Scrollable body */}
        <div className="px-5 py-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          
          {/* Step 1: Goal & Level */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-200">Выберите вашу главную фитнес-цель:</h4>
                <p className="text-xs text-slate-400">Это поможет ИИ составить правильный вектор нагрузок</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {GOALS.map((g) => {
                  const isSelected = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-2xl transition-all border flex gap-3.5 items-center",
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_12px_rgba(34,211,238,0.1)]"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700/80"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br",
                        isSelected ? g.color : "from-slate-800 to-slate-900 text-slate-400"
                      )}>
                        {g.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {g.label}
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">{g.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <h4 className="text-sm font-bold text-slate-200">Ваш уровень подготовки:</h4>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => {
                    const isSelected = level === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => setLevel(l.id)}
                        className={cn(
                          "py-2 px-1 rounded-xl text-xs font-semibold text-center border transition-all",
                          isSelected
                            ? "bg-purple-500/10 border-purple-500/50 text-purple-300"
                            : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        {l.ru}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Equipment */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-200">Где вы планируете тренироваться?</h4>
                <p className="text-xs text-slate-400">ИИ адаптирует план под выбранную среду</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {LOCATIONS.map((loc) => {
                  const isSelected = location === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setLocation(loc.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all",
                        isSelected
                          ? "bg-cyan-500/10 border-cyan-500/60 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      <span className="text-2xl leading-none">{loc.emoji}</span>
                      <div>
                        <div className="text-xs font-bold text-white line-clamp-1">{loc.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{loc.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <h4 className="text-sm font-bold text-slate-200">Доступный инвентарь:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_EQUIPMENT.map((eq) => {
                    const isSelected = selectedEquipment.includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        onClick={() => toggleEquipment(eq.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1",
                          isSelected
                            ? "bg-purple-500/15 border-purple-500/50 text-purple-300"
                            : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        {eq.label}
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
                    Свой инвентарь (или другие детали):
                  </label>
                  <input
                    type="text"
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value)}
                    placeholder="Например: гиря 16кг, медбол, петли..."
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Время на одну тренировку:
                  </h4>
                  <span className="font-mono text-sm font-bold text-cyan-300">{availableMinutes} мин</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={availableMinutes}
                  onChange={(e) => setAvailableMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
                  <span>15 мин</span>
                  <span>45 мин</span>
                  <span>60 мин</span>
                  <span>90 мин</span>
                  <span>120 мин</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-purple-400" />
                  Ваш пол (опционально):
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setGender('male')}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold border transition-all",
                      gender === 'male'
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-300"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    Мужской ♂️
                  </button>
                  <button
                    onClick={() => setGender('female')}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold border transition-all",
                      gender === 'female'
                        ? "bg-rose-500/10 border-rose-500/50 text-rose-300"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    Женский ♀️
                  </button>
                  <button
                    onClick={() => setGender(undefined)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-semibold border transition-all",
                      gender === undefined
                        ? "bg-slate-800 border-slate-700 text-slate-300"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    )}
                  >
                    Не указывать
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  Год рождения (опционально):
                </h4>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  placeholder="Например, 1992"
                  min="1920"
                  max="2018"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 transition-colors"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  Помогает ИИ делать поправку на возраст при расчете нагрузок и кардиозон.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <footer className="px-5 py-4 border-t border-slate-850 flex gap-3 bg-slate-900/30">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 text-slate-300 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-1 bg-slate-900/50 hover:bg-slate-800/60"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isNextDisabled() || loading}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-1",
              isNextDisabled() || loading
                ? "bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-[0_4px_14px_rgba(6,182,212,0.25)] hover:brightness-110"
            )}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : step === 3 ? (
              <>
                Готово
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Далее
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </footer>

      </div>
    </div>
  );
}
