import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

router.get('/', (req: AuthRequest, res: Response) => {
  const plan = db.prepare(`
    SELECT plan_data FROM week_plans WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.telegramId) as { plan_data: string } | undefined;

  if (!plan) {
    return res.json({ recipes: [] });
  }

  const planData = JSON.parse(plan.plan_data);
  const recipes: {
    name: string;
    type: string;
    typeLabel: string;
    dayNumber: number;
    cookingTime: number;
    calories: number;
    recipe: unknown;
  }[] = [];

  for (const day of planData.days || []) {
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

  res.json({ recipes });
});

router.post('/cooked', (req: AuthRequest, res: Response) => {
  const { recipeName } = req.body;
  if (!recipeName) {
    return res.status(400).json({ error: 'Название рецепта обязательно' });
  }

  db.prepare('INSERT INTO cooked_recipes (telegram_id, recipe_name) VALUES (?, ?)').run(
    req.telegramId,
    recipeName
  );

  res.json({ success: true });
});

export default router;
