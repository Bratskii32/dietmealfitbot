import { WeekPlan } from './claude.js';

export function getMoscowDateStart(date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`);
}

export function getPlanDayIndexForToday(planCreatedAt: string | Date, planLength: number): number | null {
  const created = getMoscowDateStart(new Date(planCreatedAt));
  const today = getMoscowDateStart();
  const diffDays = Math.floor((today.getTime() - created.getTime()) / 86400000);
  if (diffDays < 0 || diffDays >= planLength) return null;
  return diffDays;
}

export function getBreakfastForPlanDay(plan: WeekPlan, dayIndex: number): { name: string; calories: number } | null {
  const day = plan.days?.[dayIndex];
  const breakfast = day?.meals?.find((m) => m.type === 'breakfast');
  if (!breakfast?.recipe) return null;
  return { name: breakfast.recipe.name, calories: breakfast.recipe.calories || 0 };
}

export function getDinnerForPlanDay(plan: WeekPlan, dayIndex: number): { name: string; calories: number } | null {
  const day = plan.days?.[dayIndex];
  const dinner = day?.meals?.find((m) => m.type === 'dinner');
  if (!dinner?.recipe) return null;
  return { name: dinner.recipe.name, calories: dinner.recipe.calories || 0 };
}
