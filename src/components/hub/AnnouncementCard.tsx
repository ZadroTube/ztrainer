import { useEffect, useRef, useState } from 'react';
import { Megaphone, MoreVertical, Plus, Pencil, Trash2, Send } from 'lucide-react';
import {
  type Announcement,
  fetchActiveAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  BotApiError,
} from '@/lib/botApi';
import { BroadcastModal } from './BroadcastModal';
import { plainPreview } from '@/lib/markdown';
import { timeAgo } from '@/lib/utils';
import { AnnouncementModal } from './AnnouncementModal';

type Mode = 'idle' | 'view' | 'compose' | 'edit' | 'broadcast';

/**
 * "Что нового" card on the Home tab.
 *
 * Behavior:
 *  - All users see the active announcement (if any).
 *  - Tapping the card opens the full-text modal.
 *  - Admins additionally see a ⋮ dropdown to edit/delete, and (when no
 *    active announcement exists) a "Добавить" placeholder card.
 */
export function AnnouncementCard() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('idle');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fetch active announcement on mount.
  useEffect(() => {
    const ac = new AbortController();
    fetchActiveAnnouncement(ac.signal)
      .then((r) => {
        setAnnouncement(r.announcement);
        setIsAdmin(r.is_admin);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e instanceof BotApiError ? e.message : (e as Error).message);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleSave = async (title: string, body: string) => {
    setError(null);
    try {
      if (mode === 'compose') {
        const r = await createAnnouncement({ title, body });
        setAnnouncement(r.announcement);
      } else if (mode === 'edit' && announcement) {
        const r = await updateAnnouncement(announcement.id, { title, body });
        setAnnouncement(r.announcement);
      }
      setMode('idle');
    } catch (e) {
      throw e; // bubbled up to modal so it can show inline error
    }
  };

  const handleDelete = async () => {
    if (!announcement) return;
    if (!window.confirm('Удалить это объявление?')) return;
    setError(null);
    try {
      await deleteAnnouncement(announcement.id);
      setAnnouncement(null);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    }
  };

  // Loading state — keep silent, don't flicker a placeholder.
  if (loading) return null;

  // Admin sees an "Add" placeholder when no active announcement.
  if (!announcement && !isAdmin) return null;

  if (!announcement && isAdmin) {
    return (
      <>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('compose')}
            className="flex-1 glass rounded-2xl border border-cyan-500/25 hover:border-cyan-400/50 px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Plus className="w-5 h-5 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Объявление</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Что нового</div>
            </div>
          </button>
          <button
            onClick={() => setMode('broadcast')}
            className="glass rounded-2xl border border-purple-500/25 hover:border-purple-400/50 px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-purple-300" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">Рассылка</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Всем в чат</div>
            </div>
          </button>
        </div>

        {mode === 'compose' && (
          <AnnouncementModal
            mode="compose"
            onClose={() => setMode('idle')}
            onSave={handleSave}
          />
        )}
        {mode === 'broadcast' && (
          <BroadcastModal onClose={() => setMode('idle')} />
        )}
      </>
    );
  }

  if (!announcement) return null; // narrow type for TS below

  const preview = plainPreview(announcement.body, 90);
  const dateLabel = timeAgo(announcement.updated_at);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMode('view')}
          className="w-full glass rounded-2xl border border-cyan-500/30 hover:border-cyan-400/50 px-4 py-3 flex items-start gap-3 active:scale-[0.99] transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0 pr-7">
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-widest font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                Что нового
              </div>
              {dateLabel && (
                <div className="text-[10px] text-slate-500">· {dateLabel}</div>
              )}
            </div>
            <div className="text-sm font-bold text-white mt-0.5 line-clamp-1">
              {announcement.title}
            </div>
            {preview && (
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {preview}
              </div>
            )}
          </div>
        </button>

        {isAdmin && (
          <div ref={menuRef} className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors"
              aria-label="Меню"
            >
              <MoreVertical className="w-4 h-4 text-slate-300" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-44 glass-solid rounded-xl border border-slate-700/60 shadow-lg overflow-hidden z-10 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setMode('edit');
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-slate-200 hover:bg-cyan-500/15 transition-colors text-left"
                >
                  <Pencil className="w-4 h-4 text-cyan-300" />
                  Редактировать
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleDelete();
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-red-300 hover:bg-red-500/15 transition-colors text-left border-t border-slate-700/60"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setMode('broadcast');
                  }}
                  className="w-full px-3 py-2.5 flex items-center gap-2 text-sm text-purple-300 hover:bg-purple-500/15 transition-colors text-left border-t border-slate-700/60"
                >
                  <Send className="w-4 h-4" />
                  Разослать всем
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-300/90 px-3">Ошибка: {error}</div>
      )}

      {mode === 'view' && (
        <AnnouncementModal
          mode="view"
          announcement={announcement}
          onClose={() => setMode('idle')}
        />
      )}
      {mode === 'edit' && (
        <AnnouncementModal
          mode="edit"
          announcement={announcement}
          onClose={() => setMode('idle')}
          onSave={handleSave}
        />
      )}
      {mode === 'compose' && (
        <AnnouncementModal
          mode="compose"
          onClose={() => setMode('idle')}
          onSave={handleSave}
        />
      )}
      {mode === 'broadcast' && (
        <BroadcastModal onClose={() => setMode('idle')} />
      )}
    </>
  );
}
