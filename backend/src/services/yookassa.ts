import { createRequire } from 'module';
import type { Request } from 'express';

const require = createRequire(import.meta.url);
const YooKassa = require('yookassa');

export const PREMIUM_PRICE = '299.00';
export const PREMIUM_DESCRIPTION = 'Premium подписка — Твой Диетолог';

const YOOKASSA_CIDRS = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '77.75.154.128/25',
];

type YooKassaClient = InstanceType<typeof YooKassa>;

let client: YooKassaClient | null = null;

export function getYooKassa(): YooKassaClient {
  if (!client) {
    const shopId = process.env.YOOKASSA_SHOP_ID;
    const secretKey = process.env.YOOKASSA_SECRET_KEY;
    if (!shopId || !secretKey) {
      throw new Error('YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть заданы');
    }
    client = new YooKassa({ shopId, secretKey });
  }
  return client;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

export function isYooKassaIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '');
  if (normalized.includes(':')) {
    return normalized.toLowerCase().startsWith('2a02:5180');
  }
  return YOOKASSA_CIDRS.some((cidr) => !cidr.includes(':') && ipInCidr(normalized, cidr));
}

export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  if (Array.isArray(xff) && xff[0]) return xff[0].trim();
  return req.socket.remoteAddress || '';
}

export function isTrustedYooKassaRequest(req: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const ip = getClientIp(req);
  return isYooKassaIp(ip);
}

export async function verifyYooKassaPayment(paymentId: string): Promise<{
  telegramId: string;
  paymentId: string;
} | null> {
  const payment = await getYooKassa().getPayment(paymentId);
  if (!payment.isSucceeded) return null;
  if (payment.amount?.value !== PREMIUM_PRICE) return null;

  const telegramId = payment.metadata?.telegram_id;
  if (!telegramId) return null;

  return { telegramId: String(telegramId), paymentId: payment.id };
}
