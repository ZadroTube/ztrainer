import { useState } from 'react';
import { useUIContext, useWorkoutData } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { LogOut, Trash2, User } from 'lucide-react';

export function ProfileTab() {
  const { userProfile } = useUIContext();
  const { resetUserStats } = useWorkoutData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Full reload to reset all in-memory state cleanly.
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

  return (
    <div className="flex flex-col items-center pt-12 px-4 animate-in fade-in duration-300">
      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500/40 flex items-center justify-center mb-4 overflow-hidden">
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

      {/* Actions */}
      <div className="w-full max-w-xs mt-10 space-y-3">
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
    </div>
  );
}
