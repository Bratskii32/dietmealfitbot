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

  getRefreshStatus: () => request<{ canRefresh: boolean; isPremium: boolean; maxDays: number }>('/plan/refresh-status'),

  getChatMessages: () =>
    request<{
      messages: import('../types').ChatMessage[];
      remaining: number;
      limit: number;
      isPremium: boolean;
    }>('/chat/messages'),

  sendMessage: (message: string) =>
    request<{
      reply: string;
      remaining: number;
      limit: number;
      isPremium: boolean;
    }>('/chat/send', { method: 'POST', body: JSON.stringify({ message }) }),

  getRecipes: () => request<{ recipes: import('../types').RecipeListItem[] }>('/recipes'),

  markCooked: (recipeName: string) =>
    request('/recipes/cooked', { method: 'POST', body: JSON.stringify({ recipeName }) }),

  getProgress: () =>
    request<{
      weightLog: { weight: number; log_date: string }[];
      cookedCount: number;
      streak: number;
      achievements: { id: string; title: string; unlocked: boolean }[];
    }>('/progress'),

  saveWeight: (weight: number) =>
    request('/progress/weight', { method: 'POST', body: JSON.stringify({ weight }) }),

  getPrices: () => request<{ prices: { monthly: number; yearly: number } }>('/payment/prices'),

  createInvoice: (plan: 'monthly' | 'yearly') =>
    request<{ invoiceLink: string }>('/payment/invoice', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    }),
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        initDataUnsafe: {
          user?: { id: number; first_name?: string; last_name?: string; username?: string };
        };
      };
    };
  }
}
