const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data;
}

export const api = {
  getUser: () => request<{ exists: boolean; user?: import('../types').User }>('/user/me'),

  saveOnboarding: (data: Record<string, unknown>) =>
    request('/user/onboarding', { method: 'POST', body: JSON.stringify(data) }),

  getPlan: () => request<{
    plan: import('../types').WeekPlan | null;
    isPremium: boolean;
    maxDays: number;
    totalDays?: number;
  }>('/plan'),

  generatePlan: (upgrade = false) =>
    request<{ plan: import('../types').WeekPlan; canRefresh: boolean; isPremium: boolean; maxDays: number }>(
      '/plan/generate',
      { method: 'POST', body: JSON.stringify({ upgrade }) }
    ),

  replaceMeal: (dayNumber: number, mealType: string, recipeName: string) =>
    request<{ plan: import('../types').WeekPlan; meal: import('../types').Recipe; reason: string }>(
      '/plan/replace',
      { method: 'POST', body: JSON.stringify({ dayNumber, mealType, recipeName }) }
    ),

  getRefreshStatus: () => request<{ canRefresh: boolean; isPremium: boolean; maxDays: number }>('/plan/refresh-status'),

  getDailyStatus: () => request<{ status: string }>('/home/status'),

  getWhatToEatStatus: () =>
    request<{ isPremium: boolean; used: number; limit: number; remaining: number }>('/home/what-to-eat/status'),

  whatToEat: () =>
    request<{ suggestion: string; used: number; limit: number; remaining: number; warning?: string; isPremium: boolean }>(
      '/home/what-to-eat',
      { method: 'POST' }
    ),

  getSubscription: () => request<import('../types').SubscriptionStatus>('/subscription/status'),

  getChatMessages: () =>
    request<{
      messages: import('../types').ChatMessage[];
      remaining: number;
      limit: number;
      isPremium: boolean;
      weeklyUsed: number;
    }>('/chat/messages'),

  sendMessage: (message: string) =>
    request<{
      reply: string;
      remaining: number;
      limit: number;
      isPremium: boolean;
      weeklyUsed: number;
    }>('/chat/send', { method: 'POST', body: JSON.stringify({ message }) }),

  getRecipes: () => request<{ recipes: import('../types').RecipeListItem[] }>('/recipes'),

  markCooked: (recipeName: string) =>
    request('/recipes/cooked', { method: 'POST', body: JSON.stringify({ recipeName }) }),

  getProgress: () =>
    request<{
      weightLog: { weight: number; log_date: string }[];
      cookedCount: number;
      streak: number;
      streakMessage: string;
      aiComment: string;
      achievements: { id: string; title: string; unlocked: boolean }[];
    }>('/progress'),

  saveWeight: (weight: number) =>
    request('/progress/weight', { method: 'POST', body: JSON.stringify({ weight }) }),
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openLink: (url: string) => void;
        close: () => void;
        initDataUnsafe: {
          user?: { id: number; first_name?: string; last_name?: string; username?: string };
        };
      };
    };
  }
}
