import { useState, useRef, useEffect } from 'react';
import { useWorkoutData } from '@/context/AppContext';
import { renderMarkdown } from '@/lib/markdown';
import { Send, Sparkles, AlertCircle, MessageSquare, Maximize2, Minimize2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Как правильно делать приседания?',
  'У меня болит поясница, чем заменить становую?',
  'Составь разминку на 5 минут перед тренировкой',
  'Как подобрать рабочий вес для упражнения?',
];

export function CoachChat() {
  const { coachMessages, sendCoachMessage, deleteCoachMessage, clearCoachChat } = useWorkoutData();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>(() => {
    return (localStorage.getItem('coach_chat_font_size') as 'xs' | 'sm' | 'base') || 'sm';
  });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleFontSize = () => {
    setFontSize(prev => {
      const next = prev === 'xs' ? 'sm' : prev === 'sm' ? 'base' : 'xs';
      localStorage.setItem('coach_chat_font_size', next);
      return next;
    });
  };

  const handleClearChat = async () => {
    if (!window.confirm('Вы действительно хотите полностью очистить историю диалога с тренером?')) return;
    setError(null);
    try {
      await clearCoachChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось очистить чат.');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setError(null);
    try {
      await deleteCoachMessage(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить сообщение.');
    }
  };

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [coachMessages, loading]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setInputText('');
    setLoading(true);
    setError(null);

    try {
      await sendCoachMessage(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputText);
  };

  const hasMessages = coachMessages.length > 0;
  const bubbleTextClass = fontSize === 'xs' ? 'text-xs' : fontSize === 'sm' ? 'text-sm' : 'text-base';
  const inputTextClass = fontSize === 'xs' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn(
      "flex flex-col bg-slate-950/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300",
      isMaximized
        ? "fixed inset-0 sm:inset-4 z-50 bg-slate-950 h-auto rounded-none sm:rounded-2xl"
        : "h-[calc(100vh-290px)] min-h-[400px]"
    )}>
      {/* Disclaimer / Header Banner */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow">
            🤖
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-200">ИИ-Тренер ZTrainer</h4>
            <p className="text-[9px] text-slate-500">Техника, разминки, замены упражнений</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          {/* Font size toggle */}
          <button
            type="button"
            onClick={toggleFontSize}
            className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800/60 transition-colors text-xs font-bold font-mono active:scale-95"
            title="Размер шрифта"
          >
            {fontSize === 'xs' ? 'A' : fontSize === 'sm' ? 'A+' : 'A++'}
          </button>
          
          {/* Maximize toggle */}
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800/60 transition-colors active:scale-95"
            title={isMaximized ? "Свернуть" : "Развернуть"}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          {/* Clear chat */}
          {hasMessages && (
            <button
              type="button"
              onClick={handleClearChat}
              className="text-red-400/80 hover:text-red-450 p-1 rounded hover:bg-red-500/10 transition-colors active:scale-95"
              title="Очистить диалог"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/40 px-2 py-1 rounded-lg">
            <AlertCircle className="w-3 h-3 text-cyan-400" />
            <span>ИИ может ошибаться</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto space-y-4 py-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-semibold text-slate-200">Ваш персональный тренер</h5>
              <p className="text-xs text-slate-500 leading-relaxed">
                Спросите меня о технике упражнений, о том, как размяться, как составить сплит или чем заменить движение при боли.
              </p>
            </div>

            {/* Quick suggestions */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-left pl-1">Частые вопросы:</p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="text-left text-xs bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-slate-200 p-2.5 rounded-xl transition-all active:scale-[0.99] flex items-start gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="space-y-3.5">
            {coachMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isTemp = msg.id.startsWith('temp-');
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
                        🤖
                      </div>
                    )}
                    {isUser && (
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold flex-shrink-0">
                        👤
                      </div>
                    )}

                    {/* Bubble */}
                    <div className="flex flex-col group relative">
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 leading-relaxed break-words",
                          bubbleTextClass,
                          isUser
                            ? `bg-cyan-600/90 text-white rounded-tr-none ${isTemp ? 'opacity-60' : ''}`
                            : 'bg-slate-900 text-slate-300 border border-slate-850 rounded-tl-none markdown-styled'
                        )}
                        dangerouslySetInnerHTML={!isUser ? { __html: renderMarkdown(msg.message) } : undefined}
                      >
                        {isUser ? msg.message : undefined}
                      </div>
                      
                      {/* Timestamp & actions */}
                      <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end mr-1' : 'ml-1'}`}>
                        <span className="text-[8px] text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!isTemp && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 md:opacity-0 opacity-40 hover:opacity-100 p-0.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                            title="Удалить сообщение"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI Typing Indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0 animate-pulse">
                🤖
              </div>
              <div className="bg-slate-900 text-slate-400 border border-slate-850 rounded-2xl rounded-tl-none px-3.5 py-3 flex items-center gap-1.5">
                <span className="text-[10px] italic">Тренер подбирает рекомендации</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce duration-700" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce duration-700" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce duration-700" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Ошибка при отправке: {error}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleFormSubmit} className="border-t border-slate-850/80 bg-slate-900/40 p-3 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Спроси меня о тренировках..."
          disabled={loading}
          className={cn(
            "flex-1 bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none transition-all disabled:opacity-50",
            inputTextClass
          )}
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="active:scale-95 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-md flex-shrink-0"
          aria-label="Отправить"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
