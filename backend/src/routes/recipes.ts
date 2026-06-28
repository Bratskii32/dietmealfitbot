import { Router, Response } from 'express';
import { getLatestPlan, insertCookedRecipe } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { FREEMIUM } from '../config/freemium.js';
import { WeekPlan } from '../services/claude.js';
import { resolvePremiumUser } from '../services/premium.js';
import { checkAchievements } from '../services/achievements.js';
import { updateStreak } from '../services/streak.js';

const router = Router();

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

function findRecipeInPlan(planData: WeekPlan, recipeName: string) {
  for (const day of planData.days) {
    for (const meal of day.meals || []) {
      if (meal.recipe.name === recipeName) {
        return meal.recipe;
      }
    }
  }
  return null;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  const { isPremium } = await resolvePremiumUser(req.telegramId!);
  const maxDays = isPremium ? FREEMIUM.PREMIUM_DAYS : FREEMIUM.FREE_DAYS;

  const plan = await getLatestPlan(req.telegramId!);

  if (!plan) {
    return res.json({ recipes: [], isPremium, maxDays });
  }

  const planData = JSON.parse(plan.plan_data) as WeekPlan;
  const visibleDays = planData.days.slice(0, maxDays);
  const recipes: {
    name: string;
    type: string;
    typeLabel: string;
    dayNumber: number;
    cookingTime: number;
    calories: number;
    recipe: unknown;
  }[] = [];

  for (const day of visibleDays) {
    for (const meal of day.meals || []) {
      recipes.push({
        name: meal.recipe.name,
        type: meal.type,
        typeLabel: MEAL_TYPE_LABELS[meal.type] || meal.type,
        dayNumber: day.dayNumber,
        cookingTime: meal.recipe.cookingTime,
        calories: meal.recipe.calories,
        recipe: meal.recipe,
      });
    }
  }

  res.json({ recipes, isPremium, maxDays });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const rawId = req.params.id;
  const recipeName = decodeURIComponent(Array.isArray(rawId) ? rawId[0] : rawId);
  await updateStreak(req.telegramId!);

  const plan = await getLatestPlan(req.telegramId!);
  if (plan) {
    const planData = JSON.parse(plan.plan_data) as WeekPlan;
    const recipe = findRecipeInPlan(planData, recipeName);
    if (recipe) {
      return res.json({ recipe });
    }
  }

  res.json({ recipe: null });
});

router.post('/cooked', async (req: AuthRequest, res: Response) => {
  const { recipeName } = req.body;
  if (!recipeName) {
    return res.status(400).json({ error: 'Название рецепта обязательно' });
  }

  await insertCookedRecipe(req.telegramId!, recipeName);
  await updateStreak(req.telegramId!);
  checkAchievements(req.telegramId!).catch(() => {});

  res.json({ success: true });
});

export default router;
