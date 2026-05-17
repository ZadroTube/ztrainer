import { useEffect, useRef, useState } from 'react';
import { X, Brain, Sparkles, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  fetchMeProfile,
  addProfileFact,
  clearProfile,
  fetchMeSummary,
  BotApiError,
} from '@/lib/botApi';

type Tab = 'facts' | 'summary';

/**
 * AI dossier modal — what the bot knows about the user.
 * Two tabs:
 *   - facts:   view / add / clear the profile entries (mirrors /remember)
 *   - summary: AI-generated summary of everything the bot knows (slow, on demand)
 */
export function AIProfileModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('facts');
  const [profile, setProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    fetchMeProfile(signal)
      .then((r) => setProfile(r.profile))
      .catch((e) => {
        if (signal?.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const ac = new AbortController();
    reload(ac.signal);
    return () => ac.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZProfile
            </div>
            <h3 className="text-base font-bold text-white">Что бот знает обо мне</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-3 pt-3 flex gap-2">
          <TabButton active={tab === 'facts'} onClick={() => setTab('facts')} icon={<Brain className="w-3.5 h-3.5" />} label="Досье" />
          <TabButton active={tab === 'summary'} onClick={() => setTab('summary')} icon={<Sparkles className="w-3.5 h-3.5" />} label="AI-сводка" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {tab === 'facts' && (
            <FactsTab
              profile={profile}
              loading={loading}
              error={error}
              onProfileChange={setProfile}
              onReload={() => reload()}
            />
          )}
          {tab === 'summary' && <SummaryTab profile={profile} />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`active:scale-95 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
        active
          ? 'bg-slate-800 border border-cyan-500/30 text-cyan-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FactsTab({
  profile,
  loading,
  error,
  onProfileChange,
  onReload,
}: {
  profile: string;
  loading: boolean;
  error: string | null;
  onProfileChange: (v: string) => void;
  onReload: () => void;
}) {
  const [fact, setFact] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAdd = async () => {
    const trimmed = fact.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      const r = await addProfileFact(trimmed);
      onProfileChange(r.profile);
      setFact('');
      inputRef.current?.focus();
    } catch (e) {
      setActionError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await clearProfile();
      onProfileChange('');
      setConfirmClear(false);
    } catch (e) {
      setActionError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        Читаю досье…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-300/90 text-sm">
        Ошибка: {error}
        <button onClick={onReload} className="ml-2 text-cyan-300 text-xs underline">Повторить</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing dossier */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Текущее досье</div>
        {profile ? (
          <div className="glass rounded-xl border border-slate-700/40 px-4 py-3 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {profile}
          </div>
        ) : (
          <div className="glass rounded-xl border border-slate-700/40 px-4 py-3 text-sm text-slate-500 italic">
            Бот пока ничего о тебе не знает. Расскажи что-нибудь ниже.
          </div>
        )}
      </div>

      {/* Add fact */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Расскажи факт о себе</div>
        <textarea
          ref={inputRef}
          value={fact}
          onChange={(e) => setFact(e.target.value)}
          placeholder="Например: Мой вес 85 кг, рост 180 см. Учусь играть на гитаре."
          rows={3}
          maxLength={500}
          disabled={saving}
          className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all resize-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-500">{fact.length}/500</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !fact.trim()}
          className="w-full mt-2 active:scale-95 px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? 'ИИ-архивариус работает…' : 'Сохранить факт'}
        </button>
      </div>

      {actionError && <div className="text-red-300/90 text-xs">Ошибка: {actionError}</div>}

      {/* Clear */}
      {profile && (
        <button
          onClick={handleClear}
          disabled={saving}
          className={`w-full active:scale-95 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
            confirmClear
              ? 'bg-red-500/20 border border-red-500/50 text-red-300'
              : 'bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-red-500/40 hover:text-red-300'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {confirmClear ? 'Подтвердите очистку досье' : 'Очистить досье'}
        </button>
      )}
    </div>
  );
}

function SummaryTab({ profile }: { profile: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setText(null);
    try {
      const r = await fetchMeSummary();
      setText(r.text);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile && !text && !loading) {
    return (
      <div className="text-center text-slate-400 text-sm py-8">
        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p>Сначала наполни досье на вкладке «Досье».</p>
        <p className="text-xs text-slate-500 mt-1">AI-сводка строится на основе того, что бот уже знает.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!text && !loading && (
        <button
          onClick={generate}
          className="w-full active:scale-95 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold shadow-[0_4px_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Сформировать сводку
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6 px-1">
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          ИИ изучает твоё досье…
        </div>
      )}

      {error && <div className="text-red-300/90 text-sm">Ошибка: {error}</div>}

      {text && (
        <div className="space-y-3">
          <div className="glass rounded-xl border border-purple-500/30 px-4 py-3 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            {text}
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="w-full active:scale-95 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 text-sm font-medium transition-all disabled:opacity-50"
          >
            Сформировать заново
          </button>
        </div>
      )}
    </div>
  );
}
