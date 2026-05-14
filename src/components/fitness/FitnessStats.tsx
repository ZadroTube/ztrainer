import { useAppContext } from '../../context/AppContext';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Dumbbell, Target, Zap, Flame, Clock, Award, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

function safeFormatDate(value: unknown, fmt: string): string {
  if (typeof value !== 'number' || !isFinite(value) || value <= 0) return '';
  try { return format(value, fmt, { locale: ru }); } catch { return ''; }
}

export function FitnessStats() {
  const { plannedWorkouts, completedSets, userStats, dailyDurations, resetUserStats, userProfile } = useAppContext();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalWorkoutsPlanned = Object.keys(plannedWorkouts).length;

  let totalSetsCompleted = 0;
  Object.values(completedSets).forEach(val => {
    if (val) totalSetsCompleted++;
  });

  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

  const chartData = last7Days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const setsCompletedThisDay = Object.keys(completedSets).filter(k => k.startsWith(dayStr + '_') && completedSets[k]).length;
    return {
      name: format(day, 'EE', { locale: ru }),
      volume: setsCompletedThisDay
    };
  });

  const ACHIEVEMENTS = [
    { id: 'first_workout', title: 'Первый шаг', desc: 'Завершите 1 тренировку', icon: Target, color: 'text-cyan-400 bg-cyan-400/20 border-cyan-500/50' },
    { id: 'streak_3', title: 'В ритме', desc: '3 дня подряд', icon: Flame, color: 'text-orange-400 bg-orange-400/20 border-orange-500/50' },
    { id: 'streak_7', title: 'Неудержимый', desc: '7 дней подряд', icon: Flame, color: 'text-red-400 bg-red-400/20 border-red-500/50' },
    { id: 'time_5h', title: 'Железное время', desc: '5 часов тренировок', icon: Clock, color: 'text-purple-400 bg-purple-400/20 border-purple-500/50' },
    { id: 'volume_100', title: 'Машина', desc: '100 подходов', icon: Dumbbell, color: 'text-magenta-400 bg-magenta-400/20 border-magenta-500/50' },
  ];

  const formatTotalTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}ч ${mins}м`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* User Rank Overview */}
      <div className="flex items-center gap-4 mb-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="w-16 h-16 rounded-full border-2 border-cyan-500 flex items-center justify-center bg-slate-800 shadow-[0_0_15px_rgba(6,182,212,0.3)] overflow-hidden">
          {userProfile?.photo_url ? (
            <img src={userProfile.photo_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-cyan-400">{userProfile?.first_name?.[0] ?? 'Z'}</span>
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{userProfile?.first_name ?? userProfile?.username ?? 'Кибер-Атлет'}</h2>
          <p className="text-xs text-slate-400 mt-1">Ранг: Неоновый новичок</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-cyan-400">{userStats.currentStreak}</div>
          <div className="text-[10px] text-slate-500 uppercase mt-1">Дней подряд</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-purple-400">{userStats.totalSets}</div>
          <div className="text-[10px] text-slate-500 uppercase mt-1">Подходов</div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
          <div className="text-xl font-bold text-magenta-400 truncate">{formatTotalTime(userStats.totalWorkoutSeconds)}</div>
          <div className="text-[10px] text-slate-500 uppercase mt-1">Времени</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
            <Target className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalWorkoutsPlanned}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Дней тренинга</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center shadow-lg">
          <div className="w-10 h-10 rounded-full bg-magenta-500/20 text-magenta-400 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalSetsCompleted}</div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Выполнено сетов</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="font-semibold text-slate-200 mb-6 flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-purple-400" />
          Объем (сеты) за неделю
        </h3>
        
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: '#1e293b' }}
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
                itemStyle={{ color: '#22d3ee' }}
              />
              <Bar 
                dataKey="volume" 
                fill="#06b6d4" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievements List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" /> 
          Стена Славы
        </h3>
        
        <div className="space-y-3">
          {ACHIEVEMENTS.map(ach => {
            const unlockedAt = userStats.achievements[ach.id];
            const isUnlocked = !!unlockedAt;
            const Icon = ach.icon;

            return (
              <div 
                key={ach.id} 
                className={cn(
                  "bg-slate-800/50 rounded-xl p-3 flex items-center gap-4 transition-all border",
                  isUnlocked ? "border-slate-700 shadow-sm" : "border-transparent opacity-50 grayscale"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border", isUnlocked ? ach.color : "bg-slate-800 border-slate-700 text-slate-500")}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className={cn("text-sm font-bold", isUnlocked ? "text-white" : "text-slate-400")}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ach.desc}</p>
                  {isUnlocked && unlockedAt && (
                    <div className="text-[10px] text-cyan-500 mt-1 uppercase tracking-wider">
                      Разблокировано {safeFormatDate(unlockedAt, 'd MMM, HH:mm')}
                    </div>
                  )}
                </div>
                {!isUnlocked && (
                  <div className="text-xs text-slate-600 font-medium">🔒</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset State */}
      <div className="mt-8 flex flex-col items-center">
        {!showResetConfirm ? (
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-red-400 opacity-60 hover:opacity-100 transition-opacity border border-red-500/30 px-4 py-2 rounded-lg"
          >
            Сбросить прогресс
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl w-full text-center">
            <h4 className="text-red-400 font-bold mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Уверены?
            </h4>
            <p className="text-xs text-slate-300 mb-4">
              Это действие навсегда удалит всю статистику и достижения. Дневник будет очищен.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  resetUserStats();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              >
                Да, сбросить
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
