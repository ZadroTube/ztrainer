import { useEffect, useState } from 'react';
import { authViaTelegramWidget } from '@/lib/supabase';
import { LogIn } from 'lucide-react';

interface LoginScreenProps {
  onAuthSuccess: (data: { first_name?: string; username?: string; photo_url?: string }) => void;
}

interface WidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: WidgetUser) => void;
  }
}

export function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user: WidgetUser) => {
      setAuthenticating(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('id', String(user.id));
        params.set('first_name', user.first_name);
        if (user.last_name) params.set('last_name', user.last_name);
        if (user.username) params.set('username', user.username);
        if (user.photo_url) params.set('photo_url', user.photo_url);
        params.set('auth_date', String(user.auth_date));
        params.set('hash', user.hash);

        const result = await authViaTelegramWidget(params.toString());
        if (result) {
          onAuthSuccess({
            first_name: result.first_name,
            username: result.username,
            photo_url: result.photo_url,
          });
        } else {
          setError('Ошибка авторизации. Попробуйте снова.');
        }
      } catch {
        setError('Ошибка соединения с сервером.');
      } finally {
        setAuthenticating(false);
      }
    };

    const existing = document.getElementById('tg-login-widget');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'tg-login-widget';
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', 'ZadroTubikBot');
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-request-access', 'write');
      script.async = true;

      const container = document.getElementById('tg-widget-container');
      if (container) container.appendChild(script);
    }

    return () => { window.onTelegramAuth = undefined; };
  }, [onAuthSuccess]);

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      <div className="glow-bg"></div>
      <div className="glow-bg-2"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30">
          <LogIn className="w-8 h-8 text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">ZTrainer</h1>
        <p className="text-slate-400 text-sm text-center mb-8 max-w-xs">
          Фитнес-трекер с автосохранением прогресса. Войдите через Telegram, чтобы ваши данные были доступны с любого устройства.
        </p>

        {authenticating ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Авторизация...</p>
          </div>
        ) : (
          <div id="tg-widget-container" className="mb-4" />
        )}

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-4 py-2 rounded-xl text-center max-w-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
