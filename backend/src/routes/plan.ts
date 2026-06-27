import { Router, Response } from 'express';
import {
  getLatestPlan,
  insertPlan,
  appendDaysToPlan,
  getArchivedPlans,
  getArchivedPlan,
  updateUserLastPlanRefresh,
  parseAllergies,
  updateMealInPlan,
  incrementWeeklyChat,
  getWeeklyQueryCount,
  logEvent,
  saveShoppingList,
} from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateMealPlan, generateMealPlanExtension, suggestMealReplacement, generateShoppingList, WeekPlan } from '../services/claude.js';
import { FREEMIUM } from '../config/freemium.js';
import { resolvePremiumUser } from '../services/premium.js';
import { handleClaudeError, serviceUnavailableResponse } from '../services/claudeErrors.js';
import { buildUserProfile } from '../services/userProfile.js';

const router = Router();
const WEEKLY_LIMIT = FREEMIUM.FREE_CHAT_WEEKLY;

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function filterPlanByTier(plan: WeekPlan, isPremium: boolean): WeekPlan {
  const maxDays = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
  return {
    ...plan,
    days: plan.days.slice(0, maxDays),
  };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  const plan = await getLatestPlan(req.telegramId!);

  if (!plan) {
    return res.json({ plan: null, isPremium, maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS });
  }

  const fullPlan = JSON.parse(plan.plan_data) as WeekPlan;
  res.json({
    plan: filterPlanByTier(fullPlan, isPremium),
    isPremium,
    maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
    totalDays: fullPlan.days.length,
  });
});

router.post('/generate', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);

  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  const { upgrade } = req.body as { upgrade?: boolean };

  if (upgrade && !isPremium) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'Обновление рациона доступно в Premium',
    });
  }

  if (!isPremium && user.last_plan_refresh) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'Обновление рациона доступно в Premium',
    });
  }

  try {
    const profile = buildUserProfile(user);

    const days = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;
    const plan = await generateMealPlan(profile, days);

    await insertPlan(req.telegramId!, JSON.stringify(plan), isPremium);
    await logEvent(req.telegramId!, 'plan_generated');
    if (isPremium) {
      await updateUserLastPlanRefresh(req.telegramId!, getToday());
    }

    res.json({
      plan: filterPlanByTier(plan, isPremium),
      isPremium,
      maxDays: days,
      canRefresh: isPremium,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.post('/extend', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!isPremium) {
    return res.status(403).json({ error: 'premium_required', message: 'Доступно в Premium' });
  }
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const planRow = await getLatestPlan(req.telegramId!);
  if (!planRow) return res.status(404).json({ error: 'Рацион не найден' });

  const fullPlan = JSON.parse(planRow.plan_data) as WeekPlan;
  const currentDays = fullPlan.days?.length || 0;
  if (currentDays >= FREEMIUM.PREMIUM_DAYS) {
    return res.status(400).json({ error: 'Рацион уже полный' });
  }

  try {
    const profile = buildUserProfile(user);
    const fromDay = currentDays + 1;
    const newDays = await generateMealPlanExtension(profile, fullPlan, fromDay, FREEMIUM.PREMIUM_DAYS);
    await appendDaysToPlan(req.telegramId!, newDays);
    await logEvent(req.telegramId!, 'plan_generated');

    const updated = await getLatestPlan(req.telegramId!);
    const merged = JSON.parse(updated!.plan_data) as WeekPlan;

    res.json({
      plan: merged,
      isPremium: true,
      maxDays: FREEMIUM.PREMIUM_DAYS,
      totalDays: merged.days.length,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.post('/regenerate-new', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);
  if (!isPremium) {
    return res.status(403).json({ error: 'premium_required', message: 'Доступно в Premium' });
  }
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  try {
    const profile = buildUserProfile(user);
    const plan = await generateMealPlan(profile, FREEMIUM.PREMIUM_DAYS);
    await insertPlan(req.telegramId!, JSON.stringify(plan), true);
    await logEvent(req.telegramId!, 'plan_generated');
    await updateUserLastPlanRefresh(req.telegramId!, getToday());

    res.json({
      plan,
      isPremium: true,
      maxDays: FREEMIUM.PREMIUM_DAYS,
      totalDays: plan.days.length,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.post('/replace', async (req: AuthRequest, res: Response) => {
  const { isPremium, user } = await resolvePremiumUser(req.telegramId!);

  if (!isPremium) {
    return res.status(403).json({ error: 'premium_required', message: 'Замена блюда доступна в Premium' });
  }

  const { dayNumber, mealType, recipeName, mode = 'similar' } = req.body as {
    dayNumber?: number;
    mealType?: string;
    recipeName?: string;
    mode?: 'similar' | 'different';
  };
  if (!dayNumber || !mealType || !recipeName) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }
  if (mode !== 'similar' && mode !== 'different') {
    return res.status(400).json({ error: 'Неверный режим замены' });
  }

  try {
    const replacement = await suggestMealReplacement(
      recipeName,
      parseAllergies(user!),
      user!.goal || 'maintain',
      mode,
      mealType,
      user!.eating_style || null,
      user!.cooking_time || null
    );

    const newRecipe = {
      ...replacement,
      replaceReason: replacement.description,
    };

    await updateMealInPlan(req.telegramId!, dayNumber, mealType, newRecipe, replacement.description);

    const planRow = await getLatestPlan(req.telegramId!);
    const fullPlan = JSON.parse(planRow!.plan_data) as WeekPlan;

    res.json({
      meal: newRecipe,
      reason: replacement.description,
      plan: filterPlanByTier(fullPlan, true),
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.post('/shopping-list', async (req: AuthRequest, res: Response) => {
  const { refresh } = req.body as { refresh?: boolean };
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  const used = await getWeeklyQueryCount(req.telegramId!);

  const planRow = await getLatestPlan(req.telegramId!);
  if (!planRow) {
    return res.status(404).json({ error: 'Рацион не найден' });
  }

  if (!refresh && planRow.shopping_list) {
    return res.json({
      list: planRow.shopping_list,
      cached: true,
      remaining: isPremium ? -1 : Math.max(0, WEEKLY_LIMIT - used),
      limit: WEEKLY_LIMIT,
      isPremium,
    });
  }

  if (!isPremium && used >= WEEKLY_LIMIT) {
    return res.status(429).json({
      error: 'premium_required',
      message: 'Лимит AI-запросов на этой неделе исчерпан',
      remaining: 0,
      limit: WEEKLY_LIMIT,
    });
  }

  try {
    const fullPlan = JSON.parse(planRow.plan_data) as WeekPlan;
    const list = await generateShoppingList(fullPlan);
    await saveShoppingList(planRow.id, list);

    let newUsed = used;
    if (!isPremium) {
      newUsed = await incrementWeeklyChat(req.telegramId!);
    }

    res.json({
      list,
      cached: false,
      remaining: isPremium ? -1 : Math.max(0, WEEKLY_LIMIT - newUsed),
      limit: WEEKLY_LIMIT,
      isPremium,
    });
  } catch (error) {
    try {
      handleClaudeError(error);
    } catch {
      return serviceUnavailableResponse(res);
    }
  }
});

router.get('/refresh-status', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);

  res.json({
    canRefresh: isPremium,
    isPremium,
    maxDays: isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS,
  });
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  if (!isPremium) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'История рационов доступна в Premium',
    });
  }

  const plans = await getArchivedPlans(req.telegramId!);
  res.json({ plans });
});

router.get('/history/:id', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  if (!isPremium) {
    return res.status(403).json({
      error: 'premium_required',
      message: 'История рационов доступна в Premium',
    });
  }

  const planId = parseInt(String(req.params.id), 10);
  if (!planId) {
    return res.status(400).json({ error: 'Некорректный id' });
  }

  const archived = await getArchivedPlan(req.telegramId!, planId);
  if (!archived) {
    return res.status(404).json({ error: 'Рацион не найден' });
  }

  const fullPlan = JSON.parse(archived.plan_data) as WeekPlan;
  res.json({
    plan: fullPlan,
    createdAt: archived.created_at,
  });
});

export default router;
