import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    setIsReady(true);
  }, []);

  const user = WebApp.initDataUnsafe?.user;

  return {
    isReady,
    user,
    webApp: WebApp,
  };
}
