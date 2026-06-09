export interface User {
  telegramId: string;
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  activityLevel: string;
  mealsPerDay: number;
  allergies: string[];
  isPremium: boolean;
  onboardingComplete: boolean;
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

export interface ChatMessage {
  role: string;
  content: string;
  created_at?: string;
}

export interface RecipeListItem {
  name: string;
  type: string;
  typeLabel: string;
  dayNumber: number;
  cookingTime: number;
  calories: number;
  recipe: Recipe;
}

export type Screen = 'home' | 'chat' | 'recipes' | 'progress';
