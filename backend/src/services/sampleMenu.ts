import type { WeekPlan } from './claude.js';

/** Подарочное меню на 3 дня для PDF при первом принятии согласия */
export const SAMPLE_3_DAY_MENU: WeekPlan = {
  dailyCalories: 1800,
  dailyProtein: 90,
  dailyCarbs: 200,
  dailyFat: 60,
  days: [
    {
      dayNumber: 1,
      meals: [
        {
          type: 'breakfast',
          recipe: {
            name: 'Овсяная каша с ягодами',
            description: 'Лёгкий сбалансированный завтрак',
            ingredients: [
              { name: 'Овсяные хлопья', amount: '60', unit: 'г' },
              { name: 'Молоко 2.5%', amount: '200', unit: 'мл' },
              { name: 'Черника', amount: '50', unit: 'г' },
            ],
            instructions: ['Сварить кашу на молоке', 'Добавить ягоды'],
            cookingTime: 10,
            calories: 320,
            protein: 12,
            carbs: 48,
            fat: 8,
            servings: 1,
          },
        },
        {
          type: 'lunch',
          recipe: {
            name: 'Куриная грудка с гречкой',
            description: 'Классический обед',
            ingredients: [
              { name: 'Куриная грудка', amount: '150', unit: 'г' },
              { name: 'Гречка', amount: '80', unit: 'г' },
              { name: 'Овощной салат', amount: '150', unit: 'г' },
            ],
            instructions: ['Запечь курицу', 'Отварить гречку', 'Подать с салатом'],
            cookingTime: 35,
            calories: 520,
            protein: 45,
            carbs: 55,
            fat: 10,
            servings: 1,
          },
        },
        {
          type: 'dinner',
          recipe: {
            name: 'Творожная запеканка',
            description: 'Лёгкий ужин',
            ingredients: [
              { name: 'Творог 5%', amount: '200', unit: 'г' },
              { name: 'Яйцо', amount: '1', unit: 'шт' },
              { name: 'Мёд', amount: '10', unit: 'г' },
            ],
            instructions: ['Смешать ингредиенты', 'Запечь 25 мин при 180°C'],
            cookingTime: 30,
            calories: 380,
            protein: 28,
            carbs: 32,
            fat: 14,
            servings: 1,
          },
        },
      ],
    },
    {
      dayNumber: 2,
      meals: [
        {
          type: 'breakfast',
          recipe: {
            name: 'Омлет с овощами',
            description: 'Белковый завтрак',
            ingredients: [
              { name: 'Яйца', amount: '2', unit: 'шт' },
              { name: 'Помидор', amount: '1', unit: 'шт' },
              { name: 'Шпинат', amount: '30', unit: 'г' },
            ],
            instructions: ['Обжарить овощи', 'Залить яйцами', 'Готовить под крышкой'],
            cookingTime: 12,
            calories: 290,
            protein: 18,
            carbs: 8,
            fat: 20,
            servings: 1,
          },
        },
        {
          type: 'lunch',
          recipe: {
            name: 'Рыба на пару с рисом',
            description: 'Полезный обед',
            ingredients: [
              { name: 'Филе трески', amount: '180', unit: 'г' },
              { name: 'Рис', amount: '70', unit: 'г' },
              { name: 'Лимон', amount: '1/2', unit: 'шт' },
            ],
            instructions: ['Приготовить рыбу на пару', 'Отварить рис', 'Полить лимоном'],
            cookingTime: 30,
            calories: 480,
            protein: 38,
            carbs: 52,
            fat: 8,
            servings: 1,
          },
        },
        {
          type: 'dinner',
          recipe: {
            name: 'Салат с индейкой',
            description: 'Лёгкий ужин',
            ingredients: [
              { name: 'Индейка', amount: '120', unit: 'г' },
              { name: 'Огурец', amount: '1', unit: 'шт' },
              { name: 'Авокадо', amount: '1/2', unit: 'шт' },
            ],
            instructions: ['Обжарить индейку', 'Нарезать овощи', 'Смешать'],
            cookingTime: 15,
            calories: 350,
            protein: 32,
            carbs: 12,
            fat: 20,
            servings: 1,
          },
        },
      ],
    },
    {
      dayNumber: 3,
      meals: [
        {
          type: 'breakfast',
          recipe: {
            name: 'Греческий йогурт с гранолой',
            description: 'Быстрый завтрак',
            ingredients: [
              { name: 'Греческий йогурт', amount: '150', unit: 'г' },
              { name: 'Гранола', amount: '40', unit: 'г' },
              { name: 'Банан', amount: '1', unit: 'шт' },
            ],
            instructions: ['Выложить йогурт в миску', 'Добавить гранолу и банан'],
            cookingTime: 5,
            calories: 340,
            protein: 15,
            carbs: 52,
            fat: 9,
            servings: 1,
          },
        },
        {
          type: 'lunch',
          recipe: {
            name: 'Борщ с говядиной',
            description: 'Сытный обед',
            ingredients: [
              { name: 'Говядина', amount: '100', unit: 'г' },
              { name: 'Свёкла', amount: '80', unit: 'г' },
              { name: 'Капуста', amount: '100', unit: 'г' },
            ],
            instructions: ['Сварить бульон', 'Добавить овощи', 'Тушить 40 мин'],
            cookingTime: 60,
            calories: 420,
            protein: 28,
            carbs: 45,
            fat: 12,
            servings: 1,
          },
        },
        {
          type: 'dinner',
          recipe: {
            name: 'Овощное рагу с фасолью',
            description: 'Лёгкий ужин',
            ingredients: [
              { name: 'Фасоль консервированная', amount: '150', unit: 'г' },
              { name: 'Кабачок', amount: '150', unit: 'г' },
              { name: 'Морковь', amount: '80', unit: 'г' },
            ],
            instructions: ['Нарезать овощи', 'Тушить 25 мин', 'Добавить фасоль'],
            cookingTime: 30,
            calories: 310,
            protein: 14,
            carbs: 48,
            fat: 6,
            servings: 1,
          },
        },
      ],
    },
  ],
};

/** Расширенное меню на 7 дней (для платного PDF) */
export function getSample7DayMenu(): WeekPlan {
  const extraDays = [4, 5, 6, 7].map((n) => ({
    dayNumber: n,
    meals: [
      {
        type: 'breakfast',
        recipe: {
          name: `Завтрак дня ${n}`,
          description: 'Сбалансированный завтрак',
          ingredients: [{ name: 'Яйца', amount: '2', unit: 'шт' }],
          instructions: ['Приготовить по вкусу'],
          cookingTime: 10,
          calories: 300,
          protein: 15,
          carbs: 30,
          fat: 12,
          servings: 1,
        },
      },
      {
        type: 'lunch',
        recipe: {
          name: `Обед дня ${n}`,
          description: 'Полноценный обед',
          ingredients: [{ name: 'Курица', amount: '150', unit: 'г' }],
          instructions: ['Приготовить с гарниром'],
          cookingTime: 40,
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 12,
          servings: 1,
        },
      },
      {
        type: 'dinner',
        recipe: {
          name: `Ужин дня ${n}`,
          description: 'Лёгкий ужин',
          ingredients: [{ name: 'Рыба', amount: '150', unit: 'г' }],
          instructions: ['Запечь с овощами'],
          cookingTime: 25,
          calories: 350,
          protein: 30,
          carbs: 20,
          fat: 15,
          servings: 1,
        },
      },
    ],
  }));

  return {
    ...SAMPLE_3_DAY_MENU,
    days: [...SAMPLE_3_DAY_MENU.days, ...extraDays],
  };
}
