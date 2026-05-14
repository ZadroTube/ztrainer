import { useEffect, useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Play, Pause, X, Plus, Minus } from 'lucide-react';

function playBeep() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* ignore audio errors */ }
}

function triggerVibrate() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

export function InlineRestTimer() {
  const {
    restTimerEnd, restTimerDuration, clearRestTimer,
    isRestPaused, pauseRestTimer, resumeRestTimer, restRemainingAtPause,
    adjustRestTimer
  } = useAppContext();

  const [now, setNow] = useState(Date.now());
  const signaledRef = useRef(false);

  useEffect(() => {
    if (!restTimerEnd && !isRestPaused) {
      signaledRef.current = false;
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [restTimerEnd, isRestPaused]);

  // Signal when timer hits zero
  useEffect(() => {
    const remainingMs = isRestPaused ? restRemainingAtPause : Math.max(0, (restTimerEnd ?? 0) - now);
    if (remainingMs <= 0 && restTimerEnd && !signaledRef.current && !isRestPaused) {
      signaledRef.current = true;
      playBeep();
      triggerVibrate();
    }
  }, [now, restTimerEnd, isRestPaused, restRemainingAtPause]);

  if (!restTimerEnd && !isRestPaused) return null;

  const remainingMs = isRestPaused ? restRemainingAtPause : Math.max(0, restTimerEnd - now);
  const remainingSecs = Math.ceil(remainingMs / 1000);

  const progress = restTimerDuration > 0 ? Math.min(100, Math.max(0, (remainingMs / (restTimerDuration * 1000)) * 100)) : 0;

  const m = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
  const s = (remainingSecs % 60).toString().padStart(2, '0');

  return (
    <div className="flex flex-col gap-2 p-3 mt-2 bg-slate-900/60 rounded-xl border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] uppercase text-cyan-400 font-bold tracking-wider opacity-80">Отдых</span>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); adjustRestTimer(-30); }}
              className="active:scale-90 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-base text-white font-bold w-12 text-center select-none">{m}:{s}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); adjustRestTimer(30); }}
              className="active:scale-90 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          
          <div className="flex items-center gap-1.5 border-l border-slate-700/50 pl-4">
            <button 
              onClick={(e) => { e.stopPropagation(); isRestPaused ? resumeRestTimer() : pauseRestTimer(); }}
              className="active:scale-90 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all border border-cyan-500/20"
            >
              {isRestPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); clearRestTimer(); }}
              className="active:scale-90 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-500/20 text-red-400 transition-all border border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
        <div className="h-full bg-cyan-400 transition-all duration-300 ease-linear shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
