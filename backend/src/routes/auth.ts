import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import {
  createWebUser,
  getUserByAuthEmail,
} from '../db/repository.js';
import { AuthRequest, jwtAuthMiddleware } from '../middleware/auth.js';
import { signToken } from '../services/jwtAuth.js';
import { buildUserMeResponse } from '../services/userMe.js';

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

router.post('/register', async (req, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !isValidEmail(email.trim())) {
    return res.status(400).json({ error: 'invalid_email', message: 'Введите корректный email' });
  }
  if (!password || !isValidPassword(password)) {
    return res.status(400).json({ error: 'invalid_password', message: 'Пароль минимум 6 символов' });
  }

  const existing = await getUserByAuthEmail(email.trim());
  if (existing) {
    return res.status(409).json({ error: 'email_taken', message: 'Email уже зарегистрирован' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const telegramId = await createWebUser(email.trim(), passwordHash);
  const token = signToken(telegramId, email.trim().toLowerCase());

  res.json({
    success: true,
    token,
    user: {
      telegramId,
      email: email.trim().toLowerCase(),
    },
  });
});

router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'invalid_credentials', message: 'Введите email и пароль' });
  }

  const row = await getUserByAuthEmail(email.trim());
  if (!row?.password_hash) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный email или пароль' });
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'Неверный email или пароль' });
  }

  const token = signToken(row.telegram_id, row.email || email.trim().toLowerCase());
  res.json({
    success: true,
    token,
    user: {
      telegramId: row.telegram_id,
      email: row.email || email.trim().toLowerCase(),
    },
  });
});

router.get('/me', jwtAuthMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.telegramId?.startsWith('web_')) {
    return res.status(403).json({ error: 'web_auth_only', message: 'Только для веб-авторизации' });
  }

  const payload = await buildUserMeResponse(req.telegramId!);
  res.json(payload);
});

export default router;
