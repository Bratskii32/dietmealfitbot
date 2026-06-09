import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './middleware/auth.js';
import userRoutes from './routes/user.js';
import planRoutes from './routes/plan.js';
import chatRoutes from './routes/chat.js';
import recipesRoutes from './routes/recipes.js';
import progressRoutes from './routes/progress.js';
import paymentRoutes from './routes/payment.js';
import { initBot } from './bot/index.js';
import { setBot } from './bot/instance.js';
import './db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/plan', authMiddleware, planRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/recipes', authMiddleware, recipesRoutes);
app.use('/api/progress', authMiddleware, progressRoutes);
app.use('/api/payment', authMiddleware, paymentRoutes);

setBot(initBot());

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
