import { Router, Request, Response } from 'express';
import { getAdminStats } from '../db/repository.js';

const router = Router();

router.get('/stats', async (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken || token !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

export default router;
