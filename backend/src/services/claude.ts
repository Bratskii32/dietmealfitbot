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

  const currentDate = new Date().toLocaleDateString('ru-RU');
  const randomSeed = Math.floor(Math.random() * 99999);
  const eatingStyle = profile.eatingStyle || '';
  const cookingTime = profile.cookingTime || '';

  const prompt = `Ты — профессиональный диетолог. Составь индивидуальный рацион питания на ${days} ${days === 3 ? 'дня' : 'дней'}.
Отвечай строго на русском языке.

ВАЖНО: Дата: ${currentDate}. Seed: ${randomSeed}.

ПРАВИЛА ГЕНЕРАЦИИ:
1. Блюда простые и быстрые — большинство до 20-30 минут.
   Способы: варка, жарка, запекание, тушение.

2. Продукты доступные в обычных российских
   супермаркетах (Пятёрочка, Магнит, Перекрёсток) —
   это основная аудитория. Ничего экзотического
   по умолчанию.

3. Основа рациона — привычная еда:
   Завтраки: каши, яйца, творог, тосты, омлеты
   Обеды: супы, мясо/рыба с гарниром, салаты
   Ужины: курица/рыба/мясо + овощи, запеканки
   Перекусы: фрукты, орехи, кефир, творог
   Включай 1-2 раза в неделю простые приятные
   блюда: овсяное печенье, банановые вафли,
   смузи-боулы, ПП-десерты из 2-3 ингредиентов.

4. Если у пользователя есть предпочтения кухни
   ${eatingStyle} — учитывай:
   - quick: максимально простые и быстрые блюда
   - healthy: ПП стиль, цельные продукты, авокадо,
     растительное молоко, много овощей и зелени
   - cooking: разнообразные блюда, можно сложнее
   - varied: чередуй русскую, итальянскую,
     средиземноморскую кухни
   Если поле пустое — используй правила выше.

5. Если есть предпочтение по времени ${cookingTime}:
   - quick: все блюда до 15 минут
   - medium: до 30 минут
   - long: можно сложные блюда
   Если поле пустое — ориентируйся на 20-30 минут.

6. РАЗНООБРАЗИЕ — каждый раз уникальный рацион.
   Используй seed ${randomSeed} и дату ${currentDate}.
   Не повторяй блюда в рамках одной недели.

7. Строго соблюдай цель по калориям и БЖУ.

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

export async function suggestMealReplacement(
  recipeName: string,
  allergies: string[],
  goal: string
): Promise<{ name: string; calories: number; protein: number; carbs: number; fat: number; reason: string }> {
  const goalLabel = GOAL_MAP[goal] || goal;
  const text = await askClaude(
    `Предложи замену для "${recipeName}". Учти аллергии: ${allergies.join(', ') || 'нет'}, цель: ${goalLabel}. Верни строго JSON без текста до и после: {"name":"...","calories":0,"protein":0,"carbs":0,"fat":0,"reason":"..."}. Только русский язык.`,
    512
  );
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Не удалось распарсить замену');
  return JSON.parse(match[0]);
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
