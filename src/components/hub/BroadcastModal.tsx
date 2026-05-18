import { useState } from 'react';
import { X, Send, Eye, Loader2, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { broadcastPreview, broadcastSend, BotApiError } from '@/lib/botApi';

const DEFAULT_TEMPLATE = `Привет, {name}! Спешу рассказать о том, что у меня нового и полезного для тебя...

`;

const MARKDOWN_HINTS = [
  { sample: '*жирный*', label: 'жирный' },
  { sample: '_курсив_', label: 'курсив' },
  { sample: '`код`', label: 'моно' },
  { sample: '• пункт', label: 'список' },
  { sample: '[текст](url)', label: 'ссылка' },
];

interface BroadcastModalProps {
  onClose: () => void;
}

type Step = 'compose' | 'preview' | 'sending' | 'done';

export function BroadcastModal({ onClose }: BroadcastModalProps) {
  const [text, setText] = useState(DEFAULT_TEMPLATE);
  const [step, setStep] = useState<Step>('compose');
  const [previewText, setPreviewText] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('Текст не может быть пустым');
      return;
    }
    setError(null);
    setStep('preview');
    try {
      const r = await broadcastPreview(text);
      setPreviewText(r.preview);
      setTotalUsers(r.total_users);
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
      setStep('compose');
    }
  };

  const handleSend = async () => {
    if (!window.confirm(`Сообщение получат ${totalUsers} человек. Отправить?`)) return;
    setStep('sending');
    setError(null);
    try {
      const r = await broadcastSend(text);
      setResult({ sent: r.sent, failed: r.failed });
      setStep('done');
    } catch (e) {
      setError(e instanceof BotApiError ? e.message : (e as Error).message);
      setStep('preview');
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
            <h3 className="text-base font-bold text-white">
              {step === 'done' ? 'Готово' : 'Рассылка'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4">
          {step === 'compose' && (
            <ComposeStep
              text={text}
              onChange={setText}
              showHints={showHints}
              onToggleHints={() => setShowHints((v) => !v)}
            />
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                Превью (как увидишь ты). Получателей: <span className="text-cyan-300 font-bold">{totalUsers}</span>
              </div>
              <div className="glass-solid rounded-xl border border-slate-700/60 p-4 text-sm text-slate-200 whitespace-pre-line">
                {previewText || <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
              </div>
              <div className="text-[10px] text-slate-500">
                Подстановка <code className="text-cyan-300">{'{name}'}</code> заменится на имя каждого получателя.
              </div>
            </div>
          )}

          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <div className="text-sm text-slate-300">Отправляю сообщения…</div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">Рассылка завершена</div>
                <div className="text-sm text-slate-300 mt-1">
                  ✅ Доставлено: <span className="text-emerald-300 font-bold">{result.sent}</span>
                  {result.failed > 0 && (
                    <span className="ml-3">
                      ❌ Не доставлено: <span className="text-red-300 font-bold">{result.failed}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-300/90">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        {step === 'compose' && (
          <div className="px-5 py-4 border-t border-slate-700/50">
            <button
              onClick={handlePreview}
              disabled={!text.trim()}
              className="w-full active:scale-95 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Превью
            </button>
          </div>
        )}

        {step === 'preview' && previewText && (
          <div className="px-5 py-4 border-t border-slate-700/50 flex gap-2">
            <button
              onClick={() => setStep('compose')}
              className="flex-1 active:scale-95 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 px-4 py-2.5 text-sm font-medium transition-all"
            >
              Назад
            </button>
            <button
              onClick={handleSend}
              className="flex-1 active:scale-95 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-[0_4px_20px_rgba(6,182,212,0.3)] px-4 py-2.5 text-sm font-bold transition-all inline-flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Отправить всем
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="px-5 py-4 border-t border-slate-700/50">
            <button
              onClick={onClose}
              className="w-full active:scale-95 rounded-xl border border-slate-700 text-slate-300 hover:border-cyan-400/50 px-4 py-2.5 text-sm font-medium transition-all"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ComposeStepProps {
  text: string;
  onChange: (v: string) => void;
  showHints: boolean;
  onToggleHints: () => void;
}

function ComposeStep({ text, onChange, showHints, onToggleHints }: ComposeStepProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400">
        Напиши сообщение. Используй <code className="text-cyan-300">{'{name}'}</code> для подстановки имени получателя.
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Текст (Telegram markdown)</label>
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
          value={text}
          onChange={(e) => onChange(e.target.value)}
          maxLength={4000}
          rows={10}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400/60 resize-none"
        />
        <div className="text-[10px] text-slate-500 mt-1">{text.length}/4000</div>
      </div>

      {showHints && (
        <div className="rounded-xl bg-slate-900/40 border border-slate-700/60 p-3 space-y-2">
          <div className="text-[11px] text-slate-400">Тыкни шаблон, чтобы вставить:</div>
          <div className="flex flex-wrap gap-1.5">
            {MARKDOWN_HINTS.map((h) => (
              <button
                key={h.sample}
                type="button"
                onClick={() => onChange(text + h.sample)}
                className="px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200 transition-colors"
              >
                <code className="font-mono">{h.sample}</code>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed">
            Telegram поддерживает: *жирный*, _курсив_, `код`, [ссылка](url).<br />
            Заголовки (#) и таблицы — не поддерживаются.
          </div>
        </div>
      )}
    </div>
  );
}
