import { useEffect, useState } from 'react';
import { isTelegramWebApp, getTelegramUserName } from '../utils/telegram';

export function useTelegram() {
  const inTelegram = isTelegramWebApp();
  const [isReady, setIsReady] = useState(!inTelegram);

  useEffect(() => {
    if (!inTelegram) {
      setIsReady(true);
      return;
    }

    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    setIsReady(true);
  }, [inTelegram]);

  const user = inTelegram ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined;

  return {
    isReady,
    isTelegram: inTelegram,
    user,
    userName: user?.first_name || getTelegramUserName(),
  };
}
