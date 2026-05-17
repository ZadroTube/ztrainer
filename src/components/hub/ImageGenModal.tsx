import { useState } from 'react';
import { generateImage, BotApiError } from '@/lib/botApi';
import { X, Send } from 'lucide-react';

/**
 * Image generation modal. The mini-app collects a prompt, the bot
 * generates the picture and posts it to the user's chat. We don't
 * display the image inside the mini-app to keep things simple — the
 * user just gets a confirmation and goes back to chat to see the result.
 */
export function ImageGenModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await generateImage(trimmed);
      setDone(true);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-cyan-500/30 max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">Нарисовать картинку</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-5 overflow-y-auto custom-scrollbar text-sm text-slate-200">
          {!done && (
            <>
              <p className="text-slate-300 mb-3">
                Опиши что хочешь увидеть — бот пришлёт готовую картинку прямо в чат.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Киберпанк-город в неоне, дождливая ночь, отражения в лужах…"
                rows={4}
                maxLength={500}
                disabled={sending}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-all resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-500">{prompt.length}/500</span>
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !prompt.trim()}
                className="w-full mt-3 active:scale-95 px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Запускаю кисточки…' : 'Сгенерировать'}
              </button>
            </>
          )}

          {done && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-4xl mb-3">🎨</div>
              <h4 className="text-base font-bold text-white mb-2">Готово!</h4>
              <p className="text-slate-400 text-sm">Открой чат с ботом — там уже лежит твоя картинка.</p>
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-cyan-500/40 active:scale-95 transition-all"
              >
                Закрыть
              </button>
            </div>
          )}

          {error && (
            <div className="text-red-300/90 mt-3 text-xs">Ошибка: {error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
