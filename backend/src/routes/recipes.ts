import { Router, Response } from 'express';
import { getUser, getLatestPlan, insertCookedRecipe, isPremiumUser } from '../db/repository.js';
import { AuthRequest } from '../middleware/auth.js';
import { FREEMIUM } from '../config/freemium.js';
import { WeekPlan } from '../services/claude.js';

const router = Router();

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

router.get('/', async (req: AuthRequest, res: Response) => {
  const user = await getUser(req.telegramId!);
  const isPremium = isPremiumUser(user);
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

router.post('/cooked', async (req: AuthRequest, res: Response) => {
  const { recipeName } = req.body;
  if (!recipeName) {
    return res.status(400).json({ error: 'Название рецепта обязательно' });
  }

  await insertCookedRecipe(req.telegramId!, recipeName);

  res.json({ success: true });
});

export default router;
