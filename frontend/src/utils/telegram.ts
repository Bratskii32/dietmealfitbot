export const JWT_STORAGE_KEY = 'dietmealfit_jwt';

export function isTelegramWebApp(): boolean {
  const initData = window.Telegram?.WebApp?.initData;
  return !!initData && initData.length > 0;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(JWT_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(JWT_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(JWT_STORAGE_KEY);
}

export function openExternalLink(url: string): void {
  if (window.Telegram?.WebApp?.openLink) {
    window.Telegram.WebApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function closeMiniApp(): void {
  if (window.Telegram?.WebApp?.close) {
    window.Telegram.WebApp.close();
  }
}

export function getTelegramUserName(): string {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || '';
}
