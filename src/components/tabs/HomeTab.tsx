import { useEffect, useState } from 'react';
import { useUIContext } from '@/context/AppContext';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { fetchAbout, BotApiError } from '@/lib/botApi';
import { WeatherWidget } from '@/components/hub/WeatherWidget';
import { HelpCircle, X } from 'lucide-react';

/**
 * Home (Hub) tab. Will host the weather widget, today summary, and quick
 * action tiles in upcoming sub-steps. For now it renders the unified
 * header + weather widget + a single working tile ("О боте") that proves
 * the bot HTTP API path works end-to-end.
 */
export function HomeTab() {
  const { userProfile } = useUIContext();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300">
      <SectionHeader brand="ZHub" title={userProfile?.first_name ? `Привет, ${userProfile.first_name}` : 'Главная'} />

      {/* Weather widget */}
      <section className="mx-2 mt-2">
        <WeatherWidget />
      </section>

      {/* Quick action tiles */}
      <section className="mx-2 mt-4 grid grid-cols-2 gap-3">
        <ActionTile
          icon={<HelpCircle className="w-5 h-5" />}
          title="О боте"
          subtitle="Что умеет ZadroTubikBot"
          accent="cyan"
          onClick={() => setAboutOpen(true)}
        />
        {/* More tiles will land here in 1.3 */}
      </section>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
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
        {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
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
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-slate-700/60 max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
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
