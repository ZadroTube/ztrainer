import { useState } from 'react';
import { useWorkoutData } from '@/context/AppContext';
import { fetchProgressReport, saveBodyMetrics } from '@/lib/botApi';
import { renderMarkdown } from '@/lib/markdown';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calendar, Plus, Sparkles, AlertCircle, ChevronDown, ChevronUp, Scale, Ruler, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BodyMetric } from '@/types';

export function BodyMetricsTracker() {
  const { bodyMetrics, saveBodyMetrics: saveMetricsContext } = useWorkoutData();
  const [activeTab, setActiveTab] = useState<'weight' | 'volumes'>('weight');
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // AI Progress Report State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight_kg: '',
    chest_cm: '',
    bicep_r_cm: '',
    bicep_l_cm: '',
    waist_cm: '',
    hips_cm: '',
    thigh_r_cm: '',
    thigh_l_cm: '',
    notes: ''
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    // Parse values to number or undefined
    const parsedData: Partial<BodyMetric> = {
      date: formData.date,
      weight_kg: formData.weight_kg !== '' ? Number(formData.weight_kg) : null,
      chest_cm: formData.chest_cm !== '' ? Number(formData.chest_cm) : null,
      bicep_r_cm: formData.bicep_r_cm !== '' ? Number(formData.bicep_r_cm) : null,
      bicep_l_cm: formData.bicep_l_cm !== '' ? Number(formData.bicep_l_cm) : null,
      waist_cm: formData.waist_cm !== '' ? Number(formData.waist_cm) : null,
      hips_cm: formData.hips_cm !== '' ? Number(formData.hips_cm) : null,
      thigh_r_cm: formData.thigh_r_cm !== '' ? Number(formData.thigh_r_cm) : null,
      thigh_l_cm: formData.thigh_l_cm !== '' ? Number(formData.thigh_l_cm) : null,
      notes: formData.notes.trim() || null
    };

    try {
      // 1. Save to DB via HTTP API
      const res = await saveBodyMetrics(parsedData);
      if (res.ok) {
        // 2. Save in context (optimistic update/sync)
        await saveMetricsContext(parsedData);
        setFormOpen(false);
        // Reset only values, preserve date
        setFormData(prev => ({
          ...prev,
          weight_kg: '', chest_cm: '', bicep_r_cm: '', bicep_l_cm: '',
          waist_cm: '', hips_cm: '', thigh_r_cm: '', thigh_l_cm: '', notes: ''
        }));
      } else {
        setFormError('Ошибка сохранения замеров на сервере.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось сохранить замеры.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFetchReport = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiOpen(true);
    try {
      const res = await fetchProgressReport();
      if (res && res.report) {
        setAiReport(res.report);
      } else {
        setAiError('Не удалось получить отчет. Заполните фитнес-профиль и тренируйтесь регулярно.');
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Ошибка при обращении к ИИ.');
    } finally {
      setAiLoading(false);
    }
  };

  // Prepare chart data (needs chronological order)
  const chartData = [...bodyMetrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => {
      const d = new Date(m.date);
      return {
        ...m,
        formattedDate: format(d, 'd MMM', { locale: ru }),
        weight: m.weight_kg ?? undefined,
        waist: m.waist_cm ?? undefined,
        chest: m.chest_cm ?? undefined,
        hips: m.hips_cm ?? undefined,
        bicep: m.bicep_r_cm ? (m.bicep_r_cm + (m.bicep_l_cm ?? m.bicep_r_cm)) / 2 : undefined
      };
    });

  const hasData = chartData.length > 0;

  return (
    <div className="space-y-4">
      {/* Header and Toggle form button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Scale className="w-5 h-5 text-cyan-400" />
          Замеры и прогресс
        </h3>
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="active:scale-95 text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Записать
        </button>
      </div>

      {/* Inline Logging Form */}
      {formOpen && (
        <form
          onSubmit={handleFormSubmit}
          className="glass border border-cyan-500/30 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-300"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide">Добавить новые замеры</h4>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date Input */}
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Дата:</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Weight Input */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Вес (кг):</label>
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                placeholder="75.5"
                value={formData.weight_kg}
                onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Waist Input */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Талия (см):</label>
              <input
                type="number"
                step="0.1"
                min="40"
                max="180"
                placeholder="80.0"
                value={formData.waist_cm}
                onChange={(e) => handleInputChange('waist_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Chest Input */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Грудь (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="95.0"
                value={formData.chest_cm}
                onChange={(e) => handleInputChange('chest_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Hips Input */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Бедра (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="98.0"
                value={formData.hips_cm}
                onChange={(e) => handleInputChange('hips_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Bicep Inputs */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Бицепс П (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="35.0"
                value={formData.bicep_r_cm}
                onChange={(e) => handleInputChange('bicep_r_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Бицепс Л (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="34.8"
                value={formData.bicep_l_cm}
                onChange={(e) => handleInputChange('bicep_l_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Thigh Inputs */}
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Бедро ноги П (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="55.0"
                value={formData.thigh_r_cm}
                onChange={(e) => handleInputChange('thigh_r_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Бедро ноги Л (см):</label>
              <input
                type="number"
                step="0.1"
                placeholder="54.8"
                value={formData.thigh_l_cm}
                onChange={(e) => handleInputChange('thigh_l_cm', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Notes Input */}
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 mb-1 block uppercase">Заметки / Самочувствие:</label>
              <input
                type="text"
                placeholder="Утром натощак, после сна"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {formError && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-300 flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {formLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Сохранить замеры'
            )}
          </button>
        </form>
      )}

      {/* Recharts Trend Graphs Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        {/* Toggle between tabs */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850 max-w-[200px]">
          {(['weight', 'volumes'] as const).map(tab => {
            const isSelected = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                  isSelected 
                    ? "bg-slate-800 text-cyan-400 border border-slate-700/60 shadow" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {tab === 'weight' ? 'Вес' : 'Объемы'}
              </button>
            );
          })}
        </div>

        {/* Chart Box */}
        <div className="h-[200px] w-full flex items-center justify-center">
          {!hasData ? (
            <div className="text-center space-y-1.5 py-8">
              <Ruler className="w-8 h-8 text-slate-700 mx-auto stroke-1" />
              <p className="text-xs text-slate-500 italic max-w-[240px] leading-relaxed">
                Нет данных для графиков. Запишите вес и обхваты тела через кнопку выше.
              </p>
            </div>
          ) : activeTab === 'weight' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedDate" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name="Вес (кг)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="formattedDate" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 9, color: '#64748b' }} />
                <Line type="monotone" dataKey="waist" name="Талия" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="chest" name="Грудь" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="hips" name="Бедра" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="bicep" name="Бицепс (ср)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Progress Coach Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-base">
              🤖
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ИИ-анализатор прогресса</h4>
              <p className="text-[10px] text-slate-400">Сравнивает замеры и историю тренировок</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (aiOpen) {
                setAiOpen(false);
              } else {
                if (aiReport) {
                  setAiOpen(true);
                } else {
                  handleFetchReport();
                }
              }
            }}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {aiOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {!aiOpen && (
          <button
            onClick={handleFetchReport}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-850 border border-slate-800 text-cyan-300 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            Запросить анализ у тренера
          </button>
        )}

        {aiOpen && (
          <div className="border-t border-slate-800 pt-3 animate-in fade-in duration-300">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="relative">
                  <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                  <Sparkles className="absolute top-2 left-2 w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400">🤖 ИИ-тренер изучает статистику за месяц...</p>
              </div>
            ) : aiError ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
            ) : aiReport ? (
              <div className="space-y-3">
                <div 
                  className="text-xs text-slate-300 leading-relaxed space-y-2 markdown-styled"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(aiReport) }}
                />
                <button
                  onClick={handleFetchReport}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-950/40 border border-slate-800/80 hover:border-slate-800 text-slate-500 hover:text-cyan-300 text-[10px] font-medium transition-all flex items-center justify-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  Перегенерировать анализ
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
