import { isTelegramWebApp, getStoredToken } from '../utils/telegram';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getInitData(): string {
  if (!isTelegramWebApp()) return '';
  return window.Telegram?.WebApp?.initData || '';
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const initData = getInitData();
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
    return headers;
  }

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!navigator.onLine) {
    throw { error: 'offline', message: 'Нет подключения к интернету' };
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...buildAuthHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw { error: 'offline', message: 'Нет подключения к интернету' };
  }

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data;
}

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw { error: 'offline', message: 'Нет подключения к интернету' };
  }

  const data = await res.json();
  if (!res.ok) {
    throw { status: res.status, ...data };
  }
  return data;
}

export const api = {
  register: (email: string, password: string) =>
    publicRequest<{ success: boolean; token: string; user: { telegramId: string; email: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  login: (email: string, password: string) =>
    publicRequest<{ success: boolean; token: string; user: { telegramId: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  authMe: () =>
    request<{
      exists: boolean;
      daysAway?: number;
      user?: import('../types').User;
    }>('/auth/me'),

  getUser: () => request<{
    exists: boolean;
    daysAway?: number;
    user?: import('../types').User;
  }>('/user/me'),

  saveOnboarding: (data: Record<string, unknown>) =>
    request('/user/onboarding', { method: 'POST', body: JSON.stringify(data) }),

  getSettings: () => request<{
    notificationsEnabled: boolean;
    eatingStyle?: string | null;
    cookingTime?: string | null;
    email?: string | null;
  }>('/user/settings'),

  updateSettings: (notificationsEnabled: boolean) =>
    request('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify({ notificationsEnabled }),
    }),

  saveEmail: (email: string) =>
    request<{ success: boolean; email: string }>('/user/email', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    }),

  logEvent: (eventType: string) =>
    request('/user/event', { method: 'POST', body: JSON.stringify({ eventType }) }),

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

  savePreferences: (eatingStyle: string | null, cookingTime: string | null) =>
    request<{ success: boolean; plan: import('../types').WeekPlan; isPremium: boolean; maxDays: number }>(
      '/user/preferences',
      { method: 'POST', body: JSON.stringify({ eatingStyle, cookingTime }) }
    ),

  skipPreferences: () => request('/user/preferences/skip', { method: 'POST' }),

  getShoppingList: (refresh = false) =>
    request<{ list: string; cached?: boolean; remaining: number; limit: number; isPremium: boolean }>(
      '/plan/shopping-list',
      { method: 'POST', body: JSON.stringify({ refresh }) }
    ),

  replaceMeal: (
    dayNumber: number,
    mealType: string,
    recipeName: string,
    mode: 'similar' | 'different' = 'similar'
  ) =>
    request<{ plan: import('../types').WeekPlan; meal: import('../types').Recipe; reason: string }>(
      '/plan/replace',
      { method: 'POST', body: JSON.stringify({ dayNumber, mealType, recipeName, mode }) }
    ),

  extendPlan: () =>
    request<{
      plan: import('../types').WeekPlan;
      isPremium: boolean;
      maxDays: number;
      totalDays: number;
    }>('/plan/extend', { method: 'POST' }),

  regenerateNewPlan: () =>
    request<{
      plan: import('../types').WeekPlan;
      isPremium: boolean;
      maxDays: number;
      totalDays: number;
    }>('/plan/regenerate-new', { method: 'POST' }),

  getRefreshStatus: () => request<{ canRefresh: boolean; isPremium: boolean; maxDays: number }>('/plan/refresh-status'),

  getPlanHistory: () =>
    request<{ plans: { id: number; createdAt: string }[] }>('/plan/history'),

  getArchivedPlan: (id: number) =>
    request<{ plan: import('../types').WeekPlan; createdAt: string }>(`/plan/history/${id}`),

  getDailyStatus: () => request<{ status: string }>('/home/status'),

  getWhatToEatStatus: () =>
    request<{ isPremium: boolean; used: number; limit: number; remaining: number }>('/home/what-to-eat/status'),

  whatToEat: () =>
    request<{ suggestion: string; used: number; limit: number; remaining: number; warning?: string; isPremium: boolean }>(
      '/home/what-to-eat',
      { method: 'POST' }
    ),

  getSubscription: () => request<import('../types').SubscriptionStatus>('/subscription/status'),

  cancelSubscription: () =>
    request<{ success: boolean; premiumExpiresAt: string; message: string }>(
      '/subscription/cancel',
      { method: 'POST' }
    ),

  activatePromo: (code: string) =>
    request<{ success: boolean; days: number; premiumUntil: string; message: string }>(
      '/promo/activate',
      { method: 'POST', body: JSON.stringify({ code }) }
    ),

  createPayment: () => request<{ paymentUrl: string }>('/payment/create', { method: 'POST' }),

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
      achievements: {
        id: string;
        title: string;
        description: string;
        unlocked: boolean;
        reward_content: string | null;
        progressText: string | null;
      }[];
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
