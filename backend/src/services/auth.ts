import crypto from 'crypto';

export function validateInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

export function parseInitData(initData: string): {
  user?: { id: number; first_name?: string; last_name?: string; username?: string };
} {
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  if (!userStr) return {};
  try {
    return { user: JSON.parse(userStr) };
  } catch {
    return {};
  }
}

export function getTelegramIdFromInitData(initData: string): string | null {
  const { user } = parseInitData(initData);
  return user?.id ? String(user.id) : null;
}
