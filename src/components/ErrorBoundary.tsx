import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
          <div className="text-6xl mb-4">💥</div>
          <h1 className="text-xl font-bold mb-2">Что-то пошло не так</h1>
          <p className="text-slate-400 text-sm mb-6 text-center max-w-xs">
            {this.state.error?.message ?? 'Неизвестная ошибка'}
          </p>
          <button
            onClick={() => { (this as any).setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 active:scale-95 transition-all"
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
