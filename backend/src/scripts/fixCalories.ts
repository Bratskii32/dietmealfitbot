import 'dotenv/config';
import { initPool, query } from '../db/pool.js';
import type { WeekPlan, DayPlan } from '../services/claude.js';

const DEVIATION_THRESHOLD = 0.2;

function roundMacro(value: number): number {
  return Math.round(value);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function scaleRecipeMacros(
  recipe: DayPlan['meals'][number]['recipe'],
  coefficient: number
): DayPlan['meals'][number]['recipe'] {
  return {
    ...recipe,
    calories: roundMacro(toNumber(recipe.calories) * coefficient),
    protein: roundMacro(toNumber(recipe.protein) * coefficient),
    carbs: roundMacro(toNumber(recipe.carbs) * coefficient),
    fat: roundMacro(toNumber(recipe.fat) * coefficient),
  };
}

function fixDayCalories(day: DayPlan, dailyCalories: number): { day: DayPlan; fixed: boolean } {
  if (dailyCalories <= 0 || day.meals.length === 0) {
    return { day, fixed: false };
  }

  const actualCalories = day.meals.reduce(
    (sum, meal) => sum + toNumber(meal.recipe?.calories),
    0
  );
  if (actualCalories <= 0) {
    return { day, fixed: false };
  }

  if (Math.abs(actualCalories - dailyCalories) <= dailyCalories * DEVIATION_THRESHOLD) {
    return { day, fixed: false };
  }

  const coefficient = dailyCalories / actualCalories;
  return {
    day: {
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        recipe: scaleRecipeMacros(meal.recipe, coefficient),
      })),
    },
    fixed: true,
  };
}

function fixPlan(plan: WeekPlan): { plan: WeekPlan; daysFixed: number } {
  const dailyCalories = toNumber(plan.dailyCalories, 2000);
  let daysFixed = 0;

  const days = (plan.days || []).map((day) => {
    const result = fixDayCalories(day, dailyCalories);
    if (result.fixed) daysFixed++;
    return result.day;
  });

  return { plan: { ...plan, days }, daysFixed };
}

function parsePlanData(raw: unknown): WeekPlan {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as WeekPlan;
  }
  return raw as WeekPlan;
}

async function main() {
  await initPool();

  const { rows } = await query<{ id: number; telegram_id: string; plan_data: unknown }>(
    'SELECT id, telegram_id, plan_data FROM week_plans ORDER BY id'
  );

  console.log(`Найдено планов: ${rows.length}`);

  let plansUpdated = 0;
  let totalDaysFixed = 0;

  for (const row of rows) {
    try {
      const plan = parsePlanData(row.plan_data);
      const { plan: fixedPlan, daysFixed } = fixPlan(plan);

      if (daysFixed === 0) continue;

      await query('UPDATE week_plans SET plan_data = $2 WHERE id = $1', [
        row.id,
        JSON.stringify(fixedPlan),
      ]);

      plansUpdated++;
      totalDaysFixed += daysFixed;
      console.log(
        `✓ plan #${row.id} (${row.telegram_id}): исправлено дней ${daysFixed}, norm=${plan.dailyCalories} kcal`
      );
    } catch (err) {
      console.error(`✗ plan #${row.id} (${row.telegram_id}):`, err);
    }
  }

  console.log(`\nГотово. Обновлено планов: ${plansUpdated}, исправлено дней: ${totalDaysFixed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Ошибка миграции:', err);
  process.exit(1);
});
