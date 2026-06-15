import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import userRoutes from './routes/user.js';
import planRoutes from './routes/plan.js';
import chatRoutes from './routes/chat.js';
import recipesRoutes from './routes/recipes.js';
import progressRoutes from './routes/progress.js';
import paymentRoutes from './routes/payment.js';
import homeRoutes from './routes/home.js';
import subscriptionRoutes from './routes/subscription.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js';
import { initBot } from './bot/index.js';
import { setBot } from './bot/instance.js';
import { initDatabase } from './db/store.js';
import { startReminderCron } from './services/reminders.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/plan', authMiddleware, planRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/recipes', authMiddleware, recipesRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/payment', authMiddleware, paymentRoutes);
app.use('/api/home', authMiddleware, homeRoutes);
app.use('/api/subscription', authMiddleware, subscriptionRoutes);

async function main() {
  await initDatabase();

  setBot(initBot());
  startReminderCron();

  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
}

main().catch((err) => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});
