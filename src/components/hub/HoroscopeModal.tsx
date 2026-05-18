import { useEffect, useState } from 'react';
import { fetchHoroscope, setZodiac, BotApiError, type HoroscopeResponse, type ZodiacSign } from '@/lib/botApi';
import { X } from 'lucide-react';

const ZODIAC_LIST: { id: ZodiacSign; emoji: string; ru: string }[] = [
  { id: 'aries', emoji: '♈', ru: 'Овен' },
  { id: 'taurus', emoji: '♉', ru: 'Телец' },
  { id: 'gemini', emoji: '♊', ru: 'Близнецы' },
  { id: 'cancer', emoji: '♋', ru: 'Рак' },
  { id: 'leo', emoji: '♌', ru: 'Лев' },
  { id: 'virgo', emoji: '♍', ru: 'Дева' },
  { id: 'libra', emoji: '♎', ru: 'Весы' },
  { id: 'scorpio', emoji: '♏', ru: 'Скорпион' },
  { id: 'sagittarius', emoji: '♐', ru: 'Стрелец' },
  { id: 'capricorn', emoji: '♑', ru: 'Козерог' },
  { id: 'aquarius', emoji: '♒', ru: 'Водолей' },
  { id: 'pisces', emoji: '♓', ru: 'Рыбы' },
];

export function HoroscopeModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<HoroscopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingZodiac, setSavingZodiac] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    fetchHoroscope(signal)
      .then(setData)
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
  }, []);

  const handlePickZodiac = async (z: ZodiacSign) => {
    setSavingZodiac(true);
    try {
      await setZodiac(z);
      load(); // refetch — now with text
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingZodiac(false);
    }
  };

  const zodiacInfo = ZODIAC_LIST.find((z) => z.id === data?.zodiac);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-purple-500/30 modal-sheet overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <div>
            <div className="text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 font-bold uppercase tracking-widest">
              ZHub
            </div>
            <h3 className="text-base font-bold text-white">Гороскоп на сегодня</h3>
          </div>
          <button onClick={onClose} className="active:scale-90 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700/80 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-5 py-5 overflow-y-auto custom-scrollbar text-sm text-slate-200">
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
              Загружаю звёзды…
            </div>
          )}

          {!loading && data && !data.zodiac && (
            <div>
              <p className="text-slate-300 mb-3">Сначала укажи свой знак — буду показывать гороскоп каждый день:</p>
              <div className="grid grid-cols-3 gap-2">
                {ZODIAC_LIST.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => handlePickZodiac(z.id)}
                    disabled={savingZodiac}
                    className="active:scale-95 glass-solid rounded-xl border border-slate-700/50 hover:border-purple-400/60 px-2 py-3 flex flex-col items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl leading-none">{z.emoji}</span>
                    <span className="text-[11px] text-slate-300">{z.ru}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && data && data.zodiac && data.text && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-purple-300/90 font-bold flex items-center gap-2">
                {zodiacInfo && <span className="text-base leading-none">{zodiacInfo.emoji}</span>}
                {zodiacInfo?.ru ?? data.zodiac}
              </div>
              <p className="whitespace-pre-line">{data.text}</p>
            </div>
          )}

          {!loading && data && data.zodiac && !data.text && (
            <p className="text-slate-400">Гороскоп для тебя пока не подгрузился. Попробуй чуть позже.</p>
          )}

          {error && (
            <div className="text-red-300/90 mt-3 text-xs">Ошибка: {error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
