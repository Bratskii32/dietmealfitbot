import { Request, Response, NextFunction } from 'express';
import { validateInitData, getTelegramIdFromInitData } from '../services/auth.js';

export interface AuthRequest extends Request {
  telegramId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
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
