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
  allergies?: string[] | string;
  is_premium?: number;
  premium_until?: string;
  is_lifetime_premium?: number;
  premium_expiry_notified?: number;
  subscription_cancelled?: number;
  daily_status?: string;
  daily_status_date?: string;
  progress_ai_comment?: string;
  progress_ai_comment_date?: string;
  onboarding_complete?: number;
  consent_accepted?: number;
  pdf_gift_sent?: number;
  last_plan_refresh?: string;
  notifications_enabled?: number;
  eating_style?: string;
  cooking_time?: string;
  preferences_prompted?: number;
  last_seen_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WeekPlanRow {
  id: number;
  telegram_id: string;
  plan_data: string;
  created_at: string;
  shopping_list?: string;
  shopping_list_generated_at?: string;
}

export interface ChatMessageRow {
  id: number;
  telegram_id: string;
  role: string;
  content: string;
  created_at: string;
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

export type EventType =
  | 'user_registered'
  | 'onboarding_completed'
  | 'plan_generated'
  | 'chat_message_sent'
  | 'paywall_shown'
  | 'payment_started'
  | 'payment_completed'
  | 'subscription_cancelled';
