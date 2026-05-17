import { useEffect, useState } from 'react';
import { useUIContext, useWorkoutData } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Trash2, User, Brain, ChevronRight, Stars } from 'lucide-react';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { AIProfileModal } from '@/components/profile/AIProfileModal';
import { HoroscopeModal } from '@/components/hub/HoroscopeModal';
import { fetchMeProfile } from '@/lib/botApi';

const ZODIAC_RU: Record<string, string> = {
  aries: '♈ Овен',
  taurus: '♉ Телец',
  gemini: '♊ Близнецы',
  cancer: '♋ Рак',
  leo: '♌ Лев',
  virgo: '♍ Дева',
  libra: '♎ Весы',
  scorpio: '♏ Скорпион',
  sagittarius: '♐ Стрелец',
  capricorn: '♑ Козерог',
  aquarius: '♒ Водолей',
  pisces: '♓ Рыбы',
};

export function ProfileTab() {
  const { userProfile } = useUIContext();
  const { resetUserStats } = useWorkoutData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [zodiacOpen, setZodiacOpen] = useState(false);

  // Lightweight read of dossier preview & zodiac so the cards can show a hint.
  const [dossierPreview, setDossierPreview] = useState<string>('');
  const [zodiac, setZodiac] = useState<string | null>(null);

  const loadMeta = () => {
    const ac = new AbortController();
    fetchMeProfile(ac.signal)
      .then((r) => {
        setDossierPreview(r.profile);
        setZodiac(r.zodiac);
      })
      .catch(() => {/* silent — preview is best-effort */});
    return () => ac.abort();
  };

  useEffect(loadMeta, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleReset = () => {
    if (confirmReset) {
      resetUserStats();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const dossierLineCount = dossierPreview.split('\n').filter((l) => l.trim()).length;

  return (
    <div className="flex flex-col pb-24 animate-in fade-in duration-300">
      <SectionHeader brand="ZProfile" title="Мой профиль" />

      <div className="flex flex-col items-center pt-4 px-4">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500/40 flex items-center justify-center mb-4 overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.25)]">
          {userProfile?.photo_url ? (
            <img src={userProfile.photo_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-slate-400" />
          )}
        </div>

        <h2 className="text-lg font-bold text-white">
          {userProfile?.first_name || 'Пользователь'}
        </h2>
        {userProfile?.username && (
          <p className="text-sm text-slate-400 mt-0.5">@{userProfile.username}</p>
        )}
      </div>

      {/* AI dossier */}
      <section className="mx-2 mt-6">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 px-1">
          ИИ-досье
        </div>
        <button
          onClick={() => setAiOpen(true)}
          className="w-full glass rounded-2xl border border-cyan-500/25 hover:border-cyan-400/50 px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Что бот знает обо мне</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {dossierPreview
                ? `${dossierLineCount} ${pluralize(dossierLineCount, 'факт', 'факта', 'фактов')} в досье`
                : 'Расскажи о себе — отвечу персонально'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => setZodiacOpen(true)}
          className="w-full mt-2 glass rounded-2xl border border-purple-500/25 hover:border-purple-400/50 px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Stars className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">Знак зодиака</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {zodiac ? ZODIAC_RU[zodiac] ?? zodiac : 'Не указан — для гороскопа по утрам'}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </section>

      {/* Danger zone */}
      <section className="mx-2 mt-6">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 px-1">
          Управление
        </div>
        <div className="space-y-2">
          <button
            onClick={handleReset}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              confirmReset
                ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                : 'bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-red-500/40 hover:text-red-300'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmReset ? 'Подтвердите сброс' : 'Сбросить весь прогресс'}
          </button>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {signingOut ? 'Выход...' : 'Выйти'}
          </button>
        </div>
      </section>

      {aiOpen && <AIProfileModal onClose={() => { setAiOpen(false); loadMeta(); }} />}
      {zodiacOpen && <HoroscopeModal onClose={() => { setZodiacOpen(false); loadMeta(); }} />}
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
