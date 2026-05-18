import { useEffect, useState } from 'react';
import { useUIContext } from '@/context/AppContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { fetchAbout, sendMemes, BotApiError } from '@/lib/botApi';
import { WeatherWidget } from '@/components/hub/WeatherWidget';
import { TodaySummary } from '@/components/hub/TodaySummary';
import { TarotModal } from '@/components/hub/TarotModal';
import { HoroscopeModal } from '@/components/hub/HoroscopeModal';
import { ImageGenModal } from '@/components/hub/ImageGenModal';
import { NewsModal } from '@/components/hub/NewsModal';
import { WebSearchToggle } from '@/components/hub/WebSearchToggle';
import { HelpCircle, X, Sparkles, Stars, Smile, Brush, Loader2, Check, Newspaper } from 'lucide-react';

type ModalKind = 'about' | 'tarot' | 'horoscope' | 'image' | 'news' | null;

export function HomeTab() {
  const { userProfile } = useUIContext();
  const [modal, setModal] = useState<ModalKind>(null);

  // Memes are fire-and-forget: we don't open a modal — just show a toast-like
  // status pinned on the tile itself.
  const [memesState, setMemesState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [memesError, setMemesError] = useState<string | null>(null);

  const triggerMemes = async () => {
    if (memesState === 'sending') return;
    setMemesState('sending');
    setMemesError(null);
    try {
      await sendMemes();
      setMemesState('sent');
      setTimeout(() => setMemesState('idle'), 4000);
    } catch (e) {
      setMemesState('error');
      setMemesError(e instanceof BotApiError ? e.message : (e as Error).message);
      setTimeout(() => setMemesState('idle'), 5000);
    }
  };

  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300">
      <SectionHeader brand="ZHub" title={userProfile?.first_name ? `Привет, ${userProfile.first_name}` : 'Главная'} />

      {/* Weather widget */}
      <section className="mx-2 mt-2">
        <WeatherWidget />
      </section>

      {/* Today summary */}
      <section className="mx-2 mt-3">
        <TodaySummary />
      </section>

      {/* Web search toggle */}
      <section className="mx-2 mt-3">
        <WebSearchToggle />
      </section>

      {/* Quick action tiles */}
      <section className="mx-2 mt-4 grid grid-cols-2 gap-3">
        <ActionTile
          icon={<Sparkles className="w-5 h-5" />}
          title="Карта Таро"
          subtitle="Что приготовил день?"
          accent="magenta"
          onClick={() => setModal('tarot')}
        />
        <ActionTile
          icon={<Stars className="w-5 h-5" />}
          title="Гороскоп"
          subtitle="Звёзды на сегодня"
          accent="purple"
          onClick={() => setModal('horoscope')}
        />
        <ActionTile
          icon={<Newspaper className="w-5 h-5" />}
          title="Новости"
          subtitle="Иркутск, мир, по теме"
          accent="purple"
          onClick={() => setModal('news')}
        />
        <ActionTile
          icon={
            memesState === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> :
            memesState === 'sent' ? <Check className="w-5 h-5" /> :
            <Smile className="w-5 h-5" />
          }
          title={
            memesState === 'sending' ? 'Ищу мемы…' :
            memesState === 'sent' ? 'Готово, смотри в чат' :
            memesState === 'error' ? 'Не вышло' :
            'Мемы'
          }
          subtitle={memesError ?? 'Лови порцию в чат'}
          accent="cyan"
          onClick={triggerMemes}
        />
        <ActionTile
          icon={<Brush className="w-5 h-5" />}
          title="Нарисовать"
          subtitle="ИИ нарисует за тебя"
          accent="cyan"
          onClick={() => setModal('image')}
        />
        <ActionTile
          icon={<HelpCircle className="w-5 h-5" />}
          title="О боте"
          subtitle="Что умеет ZadroTubikBot"
          accent="cyan"
          onClick={() => setModal('about')}
        />
      </section>

      {modal === 'about' && <AboutModal onClose={() => setModal(null)} />}
      {modal === 'tarot' && <TarotModal onClose={() => setModal(null)} />}
      {modal === 'horoscope' && <HoroscopeModal onClose={() => setModal(null)} />}
      {modal === 'image' && <ImageGenModal onClose={() => setModal(null)} />}
      {modal === 'news' && <NewsModal onClose={() => setModal(null)} />}
    </div>
  );
}

type AccentColor = 'cyan' | 'magenta' | 'purple';

interface ActionTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: AccentColor;
  onClick: () => void;
}

const accentClasses: Record<AccentColor, string> = {
  cyan: 'border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.18)] text-cyan-300',
  magenta:
    'border-magenta-500/30 hover:border-magenta-400/60 hover:shadow-[0_0_20px_rgba(232,121,249,0.18)] text-magenta-300',
  purple:
    'border-purple-500/30 hover:border-purple-400/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.18)] text-purple-300',
};

function ActionTile({ icon, title, subtitle, accent, onClick }: ActionTileProps) {
  return (
    <button
      onClick={onClick}
      className={`active:scale-[0.97] glass rounded-2xl p-4 border text-left transition-all flex flex-col gap-2 ${accentClasses[accent]}`}
    >
      <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        {subtitle && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{subtitle}</div>}
      </div>
    </button>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetchAbout(ac.signal)
      .then((r) => setText(r.text))
      .catch((e) => {
        if (ac.signal.aborted) return;
        const msg = e instanceof BotApiError ? `${e.status}: ${e.message}` : (e as Error).message;
        setError(msg);
      });
    return () => ac.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass-solid rounded-t-3xl sm:rounded-3xl border border-slate-700/60 modal-sheet overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">О боте</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-4 overflow-y-auto custom-scrollbar text-sm text-slate-200 whitespace-pre-line">
          {text === null && error === null && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              Загружаю...
            </div>
          )}
          {error && (
            <div className="text-red-300/90">
              Не удалось загрузить: {error}
            </div>
          )}
          {text && text}
        </div>
      </div>
    </div>
  );
}
