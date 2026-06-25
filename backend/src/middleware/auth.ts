import { Request, Response, NextFunction } from 'express';
import { validateInitData, getTelegramIdFromInitData } from '../services/auth.js';
import { verifyToken } from '../services/jwtAuth.js';

export interface AuthRequest extends Request {
  telegramId?: string;
}

export function jwtAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    req.telegramId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyToken(authHeader.slice(7));
      req.telegramId = payload.sub;
      return next();
    } catch {
      return res.status(401).json({ error: 'Неверный токен' });
    }
  }

  const initData = req.headers['x-telegram-init-data'] as string;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (!validateInitData(initData, botToken)) {
    return res.status(401).json({ error: 'Неверные данные авторизации' });
  }

  const telegramId = getTelegramIdFromInitData(initData);
  if (!telegramId) {
    return res.status(401).json({ error: 'Пользователь не найден' });
  }

  req.telegramId = telegramId;
  next();
}
