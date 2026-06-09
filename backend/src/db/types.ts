export interface UserRow {
  telegram_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  name?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
  activity_level?: string;
  meals_per_day?: number;
  allergies?: string[];
  is_premium?: number;
  premium_until?: string;
  onboarding_complete?: number;
  last_plan_refresh?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeekPlanRow {
  id: number;
  telegram_id: string;
  plan_data: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: number;
  telegram_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface DailyQueryRow {
  id: number;
  telegram_id: string;
  query_date: string;
  count: number;
}

export interface WeightLogRow {
  id: number;
  telegram_id: string;
  weight: number;
  log_date: string;
  created_at: string;
}

export interface CookedRecipeRow {
  id: number;
  telegram_id: string;
  recipe_name: string;
  cooked_at: string;
}

export interface DatabaseSchema {
  users: UserRow[];
  week_plans: WeekPlanRow[];
  chat_messages: ChatMessageRow[];
  daily_queries: DailyQueryRow[];
  weight_log: WeightLogRow[];
  cooked_recipes: CookedRecipeRow[];
  counters: {
    week_plans: number;
    chat_messages: number;
    daily_queries: number;
    weight_log: number;
    cooked_recipes: number;
  };
}

export const defaultData: DatabaseSchema = {
  users: [],
  week_plans: [],
  chat_messages: [],
  daily_queries: [],
  weight_log: [],
  cooked_recipes: [],
  counters: {
    week_plans: 0,
    chat_messages: 0,
    daily_queries: 0,
    weight_log: 0,
    cooked_recipes: 0,
  },
};
