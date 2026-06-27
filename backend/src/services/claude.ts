import Anthropic from '@anthropic-ai/sdk';
import { UserRow } from '../db/types.js';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export interface UserProfile {
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
  activityLevel?: string;
  mealsPerDay?: number;
  allergies?: string[];
  eatingStyle?: string | null;
  cookingTime?: string | null;
}

export interface Recipe {
  name: string;
  description: string;
  ingredients: { name: string; amount: string; unit: string }[];
  instructions: string[];
  cookingTime: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
}

export interface Meal {
  type: string;
  recipe: Recipe;
}

export interface DayPlan {
  dayNumber: number;
  meals: Meal[];
}

export interface WeekPlan {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  days: DayPlan[];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(',', '.').replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function normalizeIngredients(raw: unknown): Recipe['ingredients'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item, amount: '', unit: '' };
      }
      const obj = item as Record<string, unknown>;
      return {
        name: String(obj.name ?? obj.ingredient ?? obj.product ?? ''),
        amount: String(obj.amount ?? obj.quantity ?? obj.qty ?? ''),
        unit: String(obj.unit ?? obj.measure ?? 'г'),
      };
    })
    .filter((i) => i.name);
}

function normalizeInstructions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeRecipe(raw: unknown): Recipe {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kbju = (r.kbju ?? r.macros ?? r.nutrition ?? r.KBJU) as Record<string, unknown> | undefined;

  const calories = toNumber(r.calories ?? r.kcal ?? kbju?.calories ?? kbju?.kcal);
  const protein = toNumber(r.protein ?? r.proteins ?? kbju?.protein ?? kbju?.proteins);
  const carbs = toNumber(r.carbs ?? r.carbohydrates ?? kbju?.carbs ?? kbju?.carbohydrates);
  const fat = toNumber(r.fat ?? r.fats ?? kbju?.fat ?? kbju?.fats);

  return {
    name: String(r.name ?? r.title ?? 'Блюдо'),
    description: String(r.description ?? r.desc ?? ''),
    ingredients: normalizeIngredients(r.ingredients ?? r.ingredient ?? r.products),
    instructions: normalizeInstructions(r.instructions ?? r.steps ?? r.preparation),
    cookingTime: toNumber(r.cookingTime ?? r.cookTime ?? r.time ?? r.cooking_time, 20),
    calories,
    protein,
    carbs,
    fat,
    servings: Math.max(1, toNumber(r.servings ?? r.portions, 1)),
  };
}

function normalizeMeal(raw: unknown): Meal {
  const m = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const recipeRaw = m.recipe ?? m;
  const recipe = normalizeRecipe(recipeRaw);
  if (typeof recipeRaw === 'object' && recipeRaw !== null) {
    const extra = recipeRaw as Record<string, unknown>;
    if (typeof extra.replaceReason === 'string') {
      (recipe as Recipe & { replaceReason?: string }).replaceReason = extra.replaceReason;
    }
  }
  return {
    type: String(m.type ?? 'breakfast'),
    recipe,
  };
}

export function normalizeDayPlan(raw: unknown, fallbackDayNumber: number): DayPlan {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const mealsRaw = d.meals ?? d.meal ?? [];
  const meals = Array.isArray(mealsRaw) ? mealsRaw.map(normalizeMeal) : [];
  return {
    dayNumber: toNumber(d.dayNumber ?? d.day ?? fallbackDayNumber, fallbackDayNumber),
    meals,
  };
}

function roundMacro(value: number): number {
  return Math.round(value);
}

function scaleRecipeMacros(recipe: Recipe, coefficient: number): Recipe {
  return {
    ...recipe,
    calories: roundMacro(recipe.calories * coefficient),
    protein: roundMacro(recipe.protein * coefficient),
    carbs: roundMacro(recipe.carbs * coefficient),
    fat: roundMacro(recipe.fat * coefficient),
  };
}

function validateDayCalories(day: DayPlan, dailyCalories: number): DayPlan {
  if (dailyCalories <= 0 || day.meals.length === 0) return day;

  const actualCalories = day.meals.reduce((sum, meal) => sum + meal.recipe.calories, 0);
  if (actualCalories <= 0) return day;

  if (Math.abs(actualCalories - dailyCalories) > dailyCalories * 0.3) {
    const coefficient = dailyCalories / actualCalories;
    return {
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        recipe: scaleRecipeMacros(meal.recipe, coefficient),
      })),
    };
  }

  return day;
}

function addNaturalVariation(days: DayPlan[], dailyCalories: number): DayPlan[] {
  if (dailyCalories <= 0) return days;

  return days.map((day) => {
    if (day.meals.length === 0) return day;

    const actualCalories = day.meals.reduce((sum, meal) => sum + meal.recipe.calories, 0);
    if (actualCalories <= 0) return day;

    const variation = Math.random() * 300 - 150;
    const coefficient = (dailyCalories + variation) / actualCalories;

    return {
      ...day,
      meals: day.meals.map((meal) => ({
        ...meal,
        recipe: scaleRecipeMacros(meal.recipe, coefficient),
      })),
    };
  });
}

export function applyNaturalVariation(plan: WeekPlan): WeekPlan {
  const dailyCalories = toNumber(plan.dailyCalories, 2000);
  return {
    ...plan,
    days: addNaturalVariation(plan.days, dailyCalories),
  };
}

export function normalizeWeekPlan(plan: WeekPlan): WeekPlan {
  const dailyCalories = toNumber(plan.dailyCalories, 2000);
  const validatedDays = (plan.days || []).map((d, i) =>
    validateDayCalories(normalizeDayPlan(d, i + 1), dailyCalories)
  );

  return {
    dailyCalories,
    dailyProtein: toNumber(plan.dailyProtein, 100),
    dailyCarbs: toNumber(plan.dailyCarbs, 200),
    dailyFat: toNumber(plan.dailyFat, 60),
    days: validatedDays,
  };
}

const RECIPE_JSON_EXAMPLE = `{
            "name": "Овсяная каша с бананом",
            "description": "Питательный завтрак",
            "ingredients": [{"name": "Овсяные хлопья", "amount": "80", "unit": "г"}],
            "instructions": ["Залить хлопья кипятком", "Добавить нарезанный банан"],
            "cookingTime": 10,
            "calories": 350,
            "protein": 12,
            "carbs": 58,
            "fat": 6,
            "servings": 1
          }`;

const GOAL_MAP: Record<string, string> = {
  lose: 'Похудеть',
  gain: 'Набрать массу',
  maintain: 'Поддержать вес',
};

const ACTIVITY_MAP: Record<string, string> = {
  sedentary: 'Сидячий',
  moderate: 'Умеренный',
  active: 'Активный',
};

const ALLERGY_MAP: Record<string, string> = {
  gluten: 'Глютен',
  lactose: 'Лактоза',
  nuts: 'Орехи',
  seafood: 'Морепродукты',
  pork: 'Свинина',
  none: 'Нет ограничений',
};

const PLAN_CALORIES_RULE = `Калории по дням должны ВАРЬИРОВАТЬСЯ естественно:
- Одни дни чуть больше нормы (+100-200 ккал)
- Другие дни чуть меньше нормы (-100-200 ккал)
- За неделю в среднем норма соблюдается
- НЕ делай все дни одинаковыми — это неестественно
- Допустимый диапазон каждого дня: от (dailyCalories - 200) до (dailyCalories + 200)`;

const PLAN_FRUIT_SNACK_RULE = `Фрукты в качестве отдельного перекуса указывай в штуках с примерным весом в скобках:
'1 среднее яблоко (~150г)', '1 банан (~120г)', '1 апельсин (~180г)'.
Фрукты в составе смузи, коктейлей и других блюд — указывай в граммах как обычно.`;

export async function generateMealPlan(profile: UserProfile, days = 7): Promise<WeekPlan> {
  const allergies = (profile.allergies || [])
    .map((a) => ALLERGY_MAP[a] || a)
    .join(', ') || 'Нет';

  const currentDate = new Date().toLocaleDateString('ru-RU');
  const randomSeed = Math.floor(Math.random() * 99999);
  const eatingStyle = profile.eatingStyle ?? null;
  const cookingTime = profile.cookingTime ?? null;

  const prompt = `${PLAN_CALORIES_RULE}

${PLAN_FRUIT_SNACK_RULE}

Ты — профессиональный диетолог. Составь индивидуальный рацион питания на ${days} ${days === 3 ? 'дня' : 'дней'}.
Отвечай строго на русском языке.

ВАЖНО: Дата: ${currentDate}. Seed: ${randomSeed}.

Стиль питания пользователя: ${eatingStyle ?? 'null'}
Время на готовку: ${cookingTime ?? 'null'}

ПРАВИЛА ПО СТИЛЮ:
- quick: простые привычные блюда — яйца, каши,
  куриная грудка, рыба, творог, макароны,
  тосты, супы из простых продуктов.
  Минимум ингредиентов.

- healthy: ПП-стиль — авокадо, цельнозерновой хлеб,
  растительное молоко, бурый рис, гречка,
  куриная грудка, рыба, много овощей и зелени,
  орехи, семена, смузи. Минимум обработки.

- cooking: разнообразные блюда разных кухонь —
  русская, итальянская, средиземноморская,
  европейская. Можно сложнее и интереснее.

- varied: максимальное разнообразие — чередуй
  русскую, итальянскую, средиземноморскую,
  кавказскую кухни. Каждый день разный стиль.

Если eatingStyle не указан (null) — используй
правила стиля 'quick' по умолчанию.

ПРАВИЛА ПО ВРЕМЕНИ:
- quick (до 15 мин): яичница, каши быстрого
  приготовления, бутерброды, салаты,
  разогрев готового, смузи.
- medium (до 30 мин): супы, запечённое мясо,
  паста, тушёные овощи, омлеты.
- long (30+ мин): жаркое, фаршированные блюда,
  домашние котлеты, сложные супы, выпечка.

Если cookingTime не указан (null) — используй
правила 'medium' по умолчанию.

ПРОДУКТЫ:
Основная аудитория — Россия. Используй продукты
доступные в обычных российских супермаркетах
(Пятёрочка, Магнит, Перекрёсток). Если стиль
'varied' или 'cooking' — допустимы менее
распространённые, но всё равно доступные продукты
(авокадо, киноа, тахини и подобное).

ДОПОЛНИТЕЛЬНО:
Включай 1-2 раза в неделю простые приятные блюда:
овсяное печенье, банановые вафли, смузи-боулы,
ПП-десерты из 2-3 ингредиентов.

ОБЩИЕ ПРАВИЛА:
1. Каждый раз УНИКАЛЬНЫЙ рацион — используй seed
   ${randomSeed} и дату ${currentDate}.
2. Не повторяй блюда в рамках одной недели.
3. Соблюдай цель по калориям в среднем за неделю,
   но каждый день может отличаться на ±150-200 ккал.

Данные пользователя:
- Возраст: ${profile.age}, пол: ${profile.gender === 'male' ? 'Мужской' : 'Женский'}
- Рост: ${profile.height} см, вес: ${profile.weight} кг
- Цель: ${GOAL_MAP[profile.goal || ''] || profile.goal}
- Уровень активности: ${ACTIVITY_MAP[profile.activityLevel || ''] || profile.activityLevel}
- Количество приёмов пищи: ${profile.mealsPerDay}
- Аллергии и исключения: ${allergies}

ОБЯЗАТЕЛЬНОЕ условие по перекусам:
${profile.mealsPerDay === 4 ? '- Ровно 1 перекус (type: "snack") в каждом дне' : ''}
${profile.mealsPerDay === 5 ? '- Ровно 2 перекуса (type: "snack") в каждом дне' : ''}
${profile.mealsPerDay === 3 ? '- Перекусов нет, только завтрак, обед, ужин' : ''}

Требования к рациону:
1. Рассчитай суточную норму калорий и БЖУ
2. Составь ${days} разных ${days === 3 ? 'дня' : 'дней'} (не повторяй блюда)
3. Каждый рецепт: название по-русски, ингредиенты с граммами, пошаговая инструкция, КБЖУ
4. Ответ строго в формате JSON (без лишнего текста до и после JSON)

JSON структура:
{
  "dailyCalories": 2000,
  "dailyProtein": 120,
  "dailyCarbs": 220,
  "dailyFat": 65,
  "days": [
    {
      "dayNumber": 1,
      "meals": [
        {
          "type": "breakfast",
          "recipe": ${RECIPE_JSON_EXAMPLE}
        }
      ]
    }
  ]
}`;

  console.log('generateMealPlan params:', JSON.stringify({
    days,
    profile,
    eatingStyle,
    cookingTime,
  }));

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось распарсить ответ AI');

  const normalized = normalizeWeekPlan(JSON.parse(jsonMatch[0]) as WeekPlan);
  const result = applyNaturalVariation(normalized);
  console.log('dailyCalories from Claude:', result.dailyCalories);
  console.log('day1 actual calories:', result.days[0]?.meals
    .reduce((sum, m) => sum + m.recipe.calories, 0));
  return result;
}

export async function chatWithDietitian(
  userProfile: UserProfile,
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const profileStr = JSON.stringify(userProfile, null, 2);

  const systemPrompt = `Ты — дружелюбный AI-диетолог NutriBot. Общаешься только на русском языке.
Отвечаешь исключительно на вопросы о питании, диетах, рецептах, калориях и здоровом образе жизни.
Если вопрос не по теме — вежливо объясни что ты специализируешься на питании.
Данные пользователя: ${profileStr}
Максимум 200 слов в ответе. Тон: поддерживающий, без осуждения.
При необходимости ссылайся на рацион пользователя.
⚕️ При медицинских вопросах (болезни, симптомы) — рекомендуй обратиться к врачу.`;

  const messages = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function askClaude(prompt: string, maxTokens = 256): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

export function getMoscowHour(): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Moscow', hour: 'numeric', hour12: false }).format(new Date()),
    10
  );
}

export function getStatusPeriod(hour: number): 'morning' | 'day' | 'evening' {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'day';
  return 'evening';
}

export function getDefaultPeriodStatus(name: string, period: 'morning' | 'day' | 'evening'): string {
  const n = name || 'друг';
  switch (period) {
    case 'morning':
      return `Доброе утро, ${n}! 🌅`;
    case 'day':
      return `Держишься отлично, ${n}! 💪`;
    default:
      return `Хороший вечер, ${n}! 🌙`;
  }
}

export async function generatePeriodStatus(params: {
  name: string;
  goal: string;
  dayOfWeek: string;
  period: 'morning' | 'day' | 'evening';
}): Promise<string> {
  const goalLabel = GOAL_MAP[params.goal] || params.goal;
  let prompt: string;

  if (params.period === 'morning') {
    prompt = `Напиши короткое утреннее приветствие максимум 8 слов для пользователя приложения питания.
Имя: ${params.name}, цель: ${goalLabel}, день: ${params.dayOfWeek}.
Тон: бодрый, мотивирующий, как от друга утром.
Пример: 'Максим, отличное начало недели! 💪'
Только текст, без JSON, без кавычек.`;
  } else if (params.period === 'day') {
    prompt = `Напиши короткий дневной статус максимум 8 слов.
Имя: ${params.name}, цель: ${goalLabel}.
Тон: поддерживающий, энергичный.
Пример: 'Держишь курс, Максим — так и надо 🎯'
Только текст, без JSON, без кавычек.`;
  } else {
    prompt = `Напиши короткий вечерний статус максимум 8 слов.
Имя: ${params.name}, цель: ${goalLabel}.
Тон: тёплый, подводящий итог дня.
Пример: 'Хороший день, Максим! Ты молодец 🌙'
Только текст, без JSON, без кавычек.`;
  }

  return askClaude(prompt, 60);
}

export function getTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour <= 11) return 'утро';
  if (hour >= 12 && hour <= 17) return 'день';
  if (hour >= 18 && hour <= 22) return 'вечер';
  return 'ночь';
}

export function getDefaultLiveGreeting(name: string, timeOfDay: string): string {
  const n = name || 'друг';
  switch (timeOfDay) {
    case 'утро':
      return `Доброе утро, ${n}! Хорошего дня 🌅`;
    case 'день':
      return `Держишься отлично, ${n}! 💪`;
    case 'вечер':
      return `Хороший вечер, ${n}! 🌙`;
    default:
      return `Поздно уже, ${n}. Отдыхай 😴`;
  }
}

export async function generateLiveGreeting(params: {
  name: string;
  goal: string;
  dayOfWeek: string;
  timeOfDay: string;
}): Promise<string> {
  const goalLabel = GOAL_MAP[params.goal] || params.goal;
  return askClaude(
    `Напиши короткое персональное приветствие максимум 8 слов для пользователя приложения питания.
Имя: ${params.name}
Цель: ${goalLabel}
День недели: ${params.dayOfWeek}
Время суток: ${params.timeOfDay}
Тон: как сообщение от друга — живо, поддержка.
Примеры:
'Максим, отличное начало недели! 💪'
'Держишь курс, Максим — так и надо 🎯'
'Пятница! Ты молодец на этой неделе 🔥'
'Воскресенье — день восстановления, Максим 🌿'
Только текст, без JSON, без кавычек.`,
    60
  );
}

export async function generateDailyStatus(
  goal: string,
  todayCalories: number,
  dailyNorm: number
): Promise<string> {
  const goalLabel = GOAL_MAP[goal] || goal;
  return askClaude(
    `Сгенерируй короткий комментарий максимум 6 слов про питание пользователя. Цель: ${goalLabel}, калорий сегодня: ${todayCalories} из ${dailyNorm}. Примеры стиля: '🔥 Дефицит калорий — идёшь к цели' или '⚠️ Сегодня перебор по жирам'. Только факт, без воды. Только русский язык.`
  );
}

export async function suggestWhatToEat(
  profile: UserProfile,
  currentHour: number
): Promise<string> {
  const profileStr = JSON.stringify(profile, null, 2);
  return askClaude(
    `Предложи одно блюдо прямо сейчас. Данные: ${profileStr}, время: ${currentHour}:00. Ответ на русском: название, КБЖУ одной строкой, 1 причина почему подходит. Максимум 3 строки.`,
    512
  );
}

export type ReplacementMode = 'similar' | 'different';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'завтрак',
  lunch: 'обед',
  dinner: 'ужин',
  snack: 'перекус',
};

const REPLACEMENT_RECIPE_JSON = `
Верни ПОЛНЫЙ JSON с рецептом:
{
  "name": "...",
  "description": "...",
  "ingredients": [{"name": "...", "amount": "...", "unit": "г"}],
  "instructions": ["шаг 1", "шаг 2"],
  "cookingTime": 20,
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "servings": 1
}
Обязательно укажи реальные ингредиенты с граммовкой и пошаговую инструкцию приготовления — не используй фразы типа 'приготовь по аналогии' или 'как в оригинале'.
Только русский язык, без текста до и после JSON.`;

export async function suggestMealReplacement(
  recipeName: string,
  allergies: string[],
  goal: string,
  mode: ReplacementMode = 'similar',
  mealType?: string,
  eatingStyle?: string | null,
  cookingTime?: string | null
): Promise<Recipe> {
  const goalLabel = GOAL_MAP[goal] || goal;
  const allergiesStr = allergies.join(', ') || 'нет';

  let prompt: string;
  if (mode === 'different') {
    const mealLabel = MEAL_TYPE_LABELS[mealType || ''] || mealType || 'приём пищи';
    prompt = `Пользователь хочет ДРУГОЕ блюдо вместо ${recipeName} на ${mealLabel} (${mealLabel}).
НЕ повторяй принцип исходного блюда — предложи принципиально другую категорию еды.
Учти аллергии: ${allergiesStr}, цель: ${goalLabel}, стиль питания: ${eatingStyle ?? 'null'}, время готовки: ${cookingTime ?? 'null'}.
${REPLACEMENT_RECIPE_JSON}`;
  } else {
    prompt = `Предложи вариацию блюда ${recipeName}. Учти аллергии: ${allergiesStr}, цель: ${goalLabel}. Сохрани основу блюда, адаптируй под цель.
${REPLACEMENT_RECIPE_JSON}`;
  }

  const text = await askClaude(prompt, 2048);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Не удалось распарсить замену');

  const raw = JSON.parse(match[0]) as Partial<Recipe>;
  if (!raw.name && !(raw as Record<string, unknown>).title) {
    throw new Error('AI вернул неполный рецепт');
  }

  const recipe = normalizeRecipe(raw);
  if (recipe.ingredients.length === 0) {
    throw new Error('AI вернул неполный рецепт');
  }
  if (recipe.instructions.length === 0) {
    throw new Error('AI вернул рецепт без инструкции');
  }

  return recipe;
}

export async function generateProgressComment(streakDays: number, goal: string): Promise<string> {
  const goalLabel = GOAL_MAP[goal] || goal;
  return askClaude(
    `Короткий (до 8 слов) комментарий для человека который придерживается плана ${streakDays} дней. Цель: ${goalLabel}. Стиль: поддерживающий, конкретный. Только русский язык.`
  );
}

export async function generateShoppingList(weekPlan: WeekPlan): Promise<string> {
  const planJson = JSON.stringify(weekPlan, null, 2);
  return askClaude(
    `На основе этого рациона на неделю составь список продуктов для похода в магазин. Сгруппируй по категориям: Мясо и рыба / Овощи и фрукты / Молочное / Крупы и злаки / Прочее.
Укажи количество каждого продукта в граммах суммарно на всю неделю. Рацион: ${planJson}
Ответ только на русском языке, без лишнего текста до и после списка.`,
    2048
  );
}

export async function generateMealPlanExtension(
  profile: UserProfile,
  existingPlan: WeekPlan,
  fromDay: number,
  toDay: number
): Promise<DayPlan[]> {
  const existingMeals = existingPlan.days.flatMap((d) =>
    d.meals.map((m) => m.recipe.name)
  );
  const allergies = (profile.allergies || [])
    .map((a) => ALLERGY_MAP[a] || a)
    .join(', ') || 'Нет';
  const goalLabel = GOAL_MAP[profile.goal || ''] || profile.goal;
  const eatingStyle = profile.eatingStyle ?? null;
  const cookingTime = profile.cookingTime ?? null;
  const dayCount = toDay - fromDay + 1;

  const snackRule =
    profile.mealsPerDay === 4
      ? '- Ровно 1 перекус (type: "snack") в каждом дне'
      : profile.mealsPerDay === 5
        ? '- Ровно 2 перекуса (type: "snack") в каждом дне'
        : '- Перекусов нет, только завтрак, обед, ужин';

  const prompt = `${PLAN_CALORIES_RULE}

${PLAN_FRUIT_SNACK_RULE}

Ты — диетолог. У пользователя уже есть рацион на дни 1-${fromDay - 1}.
Существующие блюда (НЕ повторяй): ${existingMeals.join(', ')}.
Составь дни ${fromDay}-${toDay} (${dayCount} ${dayCount === 1 ? 'день' : dayCount < 5 ? 'дня' : 'дней'}) в том же стиле.
Цель: ${goalLabel}. Аллергии: ${allergies}.
Стиль питания: ${eatingStyle ?? 'null'}. Время на готовку: ${cookingTime ?? 'null'}.
Калории/БЖУ как в плане: ${existingPlan.dailyCalories} ккал, Б${existingPlan.dailyProtein} Ж${existingPlan.dailyFat} У${existingPlan.dailyCarbs}.
Количество приёмов пищи: ${profile.mealsPerDay}
${snackRule}

Каждый рецепт ОБЯЗАТЕЛЬНО содержит все поля: name, description, ingredients, instructions, cookingTime, calories, protein, carbs, fat, servings.
calories, protein, carbs, fat, cookingTime, servings — только числа, не строки.
ingredients — массив объектов {name, amount, unit}. instructions — массив строк.

Ответ строго JSON-массив days (без текста до и после):
[
  {
    "dayNumber": ${fromDay},
    "meals": [
      {
        "type": "breakfast",
        "recipe": ${RECIPE_JSON_EXAMPLE}
      }
    ]
  }
]`;

  const text = await askClaude(prompt, 12000);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  let parsed: unknown[];
  if (arrayMatch) {
    parsed = JSON.parse(arrayMatch[0]) as unknown[];
  } else {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error('Не удалось распарсить дополнение рациона');
    const obj = JSON.parse(objMatch[0]) as { days?: unknown[] };
    if (!Array.isArray(obj.days)) throw new Error('Не удалось распарсить дополнение рациона');
    parsed = obj.days;
  }

  const dailyCalories = toNumber(existingPlan.dailyCalories, 2000);
  const validatedDays = parsed.map((day, i) =>
    validateDayCalories(normalizeDayPlan(day, fromDay + i), dailyCalories)
  );

  return addNaturalVariation(validatedDays, dailyCalories);
}

export async function generateAchievementReward(
  achievementKey: string,
  user: UserRow
): Promise<string> {
  const goalLabel = GOAL_MAP[user.goal || ''] || user.goal || 'Поддержать вес';
  const profileStr = JSON.stringify(
    { goal: user.goal, weight: user.weight, height: user.height, age: user.age },
    null,
    2
  );

  const prompts: Record<string, string> = {
    cook_3: `Придумай простой вкусный ПП-десерт из 3-4 ингредиентов. Учти цель пользователя: ${goalLabel}. Дай название, ингредиенты с граммовкой, 3-4 шага приготовления и КБЖУ. Формат: обычный текст, не JSON.`,
    streak_3: `Пользователь придерживается плана 3 дня подряд. Цель: ${goalLabel}, вес: ${user.weight}, рост: ${user.height}. Дай один конкретный практический совет по питанию именно под его цель. Максимум 3 предложения, дружеский тон, без воды.`,
    streak_7: `Придумай вкусное праздничное блюдо которое вписывается в цель ${goalLabel}. Название, ингредиенты с граммовкой, шаги приготовления, КБЖУ. Формат: обычный текст.`,
    streak_14: `Пользователь держит режим питания 14 дней. Цель: ${goalLabel}, параметры: ${profileStr}. Дай персональные рекомендации на следующие 2 недели — что добавить в рацион, чего избегать, как скорректировать КБЖУ для прогресса. Максимум 5 конкретных пунктов.`,
  };

  const prompt = prompts[achievementKey];
  if (!prompt) return '';
  return askClaude(prompt, 1024);
}
