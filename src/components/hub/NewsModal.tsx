import { useEffect, useRef, useState } from 'react';
import { X, Search, Newspaper, Globe, MapPin, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchTopNews, fetchTopicNews, BotApiError, type NewsItem, type NewsSource } from '@/lib/botApi';
import { cn } from '@/lib/utils';

type Mode = 'irkutsk' | 'world' | 'topic';

/**
 * News modal with three modes: Irkutsk, World, by-topic search.
 * AI-curated headlines (server side); the modal renders compact cards
 * with external links.
 */
export function NewsModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('irkutsk');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 modal-sheet-tall overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">Новости</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Mode tabs */}
        <div className="px-3 pt-3 flex gap-2">
          <ModeTab active={mode === 'irkutsk'} onClick={() => setMode('irkutsk')} icon={<MapPin className="w-3.5 h-3.5" />} label="Иркутск" />
          <ModeTab active={mode === 'world'} onClick={() => setMode('world')} icon={<Globe className="w-3.5 h-3.5" />} label="Мир" />
          <ModeTab active={mode === 'topic'} onClick={() => setMode('topic')} icon={<Search className="w-3.5 h-3.5" />} label="По теме" />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
          {mode === 'topic' ? <TopicSearch /> : <SourceFeed source={mode} />}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'active:scale-95 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all',
        active
          ? 'bg-slate-800 border border-cyan-500/30 text-cyan-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)]'
          : 'bg-slate-900/50 text-slate-400 border border-transparent glass-solid'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const summary = item.summary || item.description || '';
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="active:scale-[0.99] glass-solid rounded-xl border border-slate-700/40 hover:border-cyan-400/40 px-4 py-3 block transition-all"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white leading-snug">{item.title}</div>
          {summary && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-snug">{summary}</p>
          )}
          {item.source && (
            <div className="text-[10px] text-slate-500 mt-1.5">{item.source}</div>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
      </div>
    </a>
  );
}

function SourceFeed({ source }: { source: NewsSource }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    fetchTopNews(source, signal)
      .then((r) => setItems(r.items))
      .catch((e) => {
        if (signal?.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (loading && !items) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
        ИИ выбирает самое интересное…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-300/90 text-sm py-4">
        Ошибка: {error}
        <button
          onClick={() => load()}
          className="ml-2 text-cyan-300 hover:text-cyan-200 active:scale-95 inline-flex items-center gap-1 text-xs"
        >
          <RefreshCw className="w-3 h-3" /> Повторить
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div className="text-slate-400 text-sm py-6 text-center">Новостей пока нет.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {source === 'irkutsk' ? 'Иркутск · irk.ru' : 'Мир · rbc.ru'}
        </span>
        <button
          onClick={() => load()}
          disabled={loading}
          className="active:scale-90 w-7 h-7 flex items-center justify-center rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 disabled:opacity-50 transition-all"
          title="Обновить"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {items.map((item, i) => (
        <NewsCard key={`${i}-${item.link}`} item={item} />
      ))}
    </div>
  );
}

function TopicSearch() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetchTopicNews(trimmed);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Тема: технологии, футбол, крипта…"
          className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-9 pr-24 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all"
        />
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 active:scale-95 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 text-xs font-medium transition-all"
        >
          {loading ? '…' : 'Найти'}
        </button>
      </div>

      {!loading && items === null && !error && (
        <div className="mt-6 text-center text-slate-500 text-xs">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Введи тему и нажми Найти. ИИ соберёт свежие новости за последнюю неделю.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6">
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          ИИ ищет и пересказывает…
        </div>
      )}

      {error && <div className="text-red-300/90 text-sm py-4">Ошибка: {error}</div>}

      {!loading && items && items.length === 0 && (
        <div className="text-slate-400 text-sm py-6 text-center">По этой теме ничего не нашлось.</div>
      )}

      {items && items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((item, i) => (
            <NewsCard key={`${i}-${item.link}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
