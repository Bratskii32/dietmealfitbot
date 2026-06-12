import Anthropic from '@anthropic-ai/sdk';

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

export async function generateMealPlan(profile: UserProfile, days = 7): Promise<WeekPlan> {
  const allergies = (profile.allergies || [])
    .map((a) => ALLERGY_MAP[a] || a)
    .join(', ') || 'Нет';

  const prompt = `Ты — профессиональный диетолог. Составь индивидуальный рацион питания на ${days} ${days === 3 ? 'дня' : 'дней'}.
Отвечай строго на русском языке.

Данные пользователя:
- Возраст: ${profile.age}, пол: ${profile.gender === 'male' ? 'Мужской' : 'Женский'}
- Рост: ${profile.height} см, вес: ${profile.weight} кг
- Цель: ${GOAL_MAP[profile.goal || ''] || profile.goal}
- Уровень активности: ${ACTIVITY_MAP[profile.activityLevel || ''] || profile.activityLevel}
- Количество приёмов пищи: ${profile.mealsPerDay}
- Аллергии и исключения: ${allergies}

Требования к рациону:
1. Рассчитай суточную норму калорий и БЖУ
2. Составь ${days} разных ${days === 3 ? 'дня' : 'дней'} (не повторяй блюда)
3. Используй доступные в России продукты
4. Каждый рецепт: название по-русски, ингредиенты с граммами, пошаговая инструкция, КБЖУ
5. Ответ строго в формате JSON (без лишнего текста до и после JSON)

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
          "recipe": {
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
          }
        }
      ]
    }
  ]
}`;

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

  return JSON.parse(jsonMatch[0]) as WeekPlan;
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
