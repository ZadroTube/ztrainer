import { useEffect, useState } from 'react';
import { X, HelpCircle, Loader2 } from 'lucide-react';
import type { Announcement } from '@/lib/botApi';
import { renderMarkdown } from '@/lib/markdown';
import { timeAgo } from '@/lib/utils';
import { BotApiError } from '@/lib/botApi';

type Mode = 'view' | 'edit' | 'compose';

interface BaseProps {
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: 'view'; announcement: Announcement })
  | (BaseProps & { mode: 'edit'; announcement: Announcement; onSave: (title: string, body: string) => Promise<void> })
  | (BaseProps & { mode: 'compose'; onSave: (title: string, body: string) => Promise<void> });

const HEADER_TITLE: Record<Mode, string> = {
  view: 'Что нового',
  edit: 'Редактирование',
  compose: 'Новое объявление',
};

const MARKDOWN_HINTS = [
  { sample: '*жирный*', label: 'жирный' },
  { sample: '_курсив_', label: 'курсив' },
  { sample: '`код`', label: 'моно' },
  { sample: '# Заголовок', label: 'заголовок' },
  { sample: '- пункт', label: 'список' },
  { sample: '[текст](url)', label: 'ссылка' },
  { sample: '> цитата', label: 'цитата' },
];

export function AnnouncementModal(props: Props) {
  const { mode, onClose } = props;
  const isEditing = mode === 'edit' || mode === 'compose';

  const [title, setTitle] = useState(
    mode === 'edit' ? props.announcement.title : '',
  );
  const [body, setBody] = useState(
    mode === 'edit' ? props.announcement.body : '',
  );
  const [showHints, setShowHints] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock scroll while modal is mounted (matches other modals' behavior on iOS).
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = async () => {
    if (!isEditing) return;
    if (!title.trim() || !body.trim()) {
      setError('Заголовок и текст не должны быть пустыми');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if ('onSave' in props) {
        await props.onSave(title.trim(), body.trim());
      }
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 modal-sheet-tall overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">{HEADER_TITLE[mode]}</h3>
          </div>
          <button
            onClick={onClose}
            className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {mode === 'view' ? (
            <ViewBody announcement={props.announcement} />
          ) : (
            <EditBody
              title={title}
              body={body}
              onTitleChange={setTitle}
              onBodyChange={setBody}
              showHints={showHints}
              onToggleHints={() => setShowHints((v) => !v)}
            />
          )}
        </div>

        {isEditing && (
          <div className="px-5 py-4 border-t border-slate-700/50 flex flex-col gap-2">
            {error && <div className="text-xs text-red-300/90">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={saving}
                className="flex-1 active:scale-95 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !title.trim() || !body.trim()}
                className="flex-1 active:scale-95 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'compose' ? 'Опубликовать' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewBody({ announcement }: { announcement: Announcement }) {
  const html = renderMarkdown(announcement.body);
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-white">{announcement.title}</h2>
      <div className="text-[11px] text-slate-500">
        обновлено {timeAgo(announcement.updated_at)}
      </div>
      <div
        className="prose-announcement text-sm text-slate-200 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

interface EditProps {
  title: string;
  body: string;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  showHints: boolean;
  onToggleHints: () => void;
}

function EditBody({ title, body, onTitleChange, onBodyChange, showHints, onToggleHints }: EditProps) {
  const insertSnippet = (snippet: string) => {
    onBodyChange((body ? body + '\n' : '') + snippet);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400 mb-1 block">Заголовок</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
          placeholder="Например: Добавил веб-поиск"
          className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Текст (markdown)</label>
          <button
            type="button"
            onClick={onToggleHints}
            className="text-[11px] text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            {showHints ? 'Скрыть' : 'Подсказки'}
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          maxLength={10_000}
          rows={10}
          placeholder={'Что нового, что починил, что планируешь.\n\nПоддерживается markdown.'}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400/60 resize-none"
        />
        <div className="text-[10px] text-slate-500 mt-1">{body.length}/10000</div>
      </div>

      {showHints && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-700/60 p-3 space-y-2">
          <div className="text-[11px] text-slate-400">
            Тыкни шаблон, чтобы вставить:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MARKDOWN_HINTS.map((h) => (
              <button
                key={h.sample}
                type="button"
                onClick={() => insertSnippet(h.sample)}
                className="px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 transition-colors"
                title={h.label}
              >
                <code className="font-mono">{h.sample}</code>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            Заголовки: <code>#</code>, <code>##</code>, <code>###</code>.<br />
            Списки: строки, начинающиеся с <code>- пункт</code> или <code>1. пункт</code>.<br />
            Перенос строки = новый абзац.
          </div>
        </div>
      )}
    </div>
  );
}
