/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppProvider, useAppContext } from './context/AppContext';
import { TabContainer } from './components/tabs/TabContainer';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { loading, loadError } = useAppContext();

  if (loading) {
    return (
      <div className="h-screen w-full max-w-md mx-auto flex flex-col items-center justify-center bg-slate-950 text-cyan-400">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Загрузка...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen w-full max-w-md mx-auto flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
        <h1 className="text-lg font-bold mb-2 text-center">Ошибка загрузки</h1>
        <p className="text-slate-400 text-sm text-center mb-6">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 active:scale-95 transition-all"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto relative flex flex-col bg-slate-900 overflow-hidden sm:border-x sm:border-slate-800/50">
      <div className="glow-bg"></div>
      <div className="glow-bg-2"></div>
      <div className="relative z-10 flex flex-col h-full">
        <TabContainer />
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
