import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-600/90 text-white text-xs font-medium py-1.5 px-4 backdrop-blur-sm animate-in slide-in-from-top fade-in duration-300">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Нет соединения — изменения сохранятся при восстановлении сети</span>
    </div>
  );
}
