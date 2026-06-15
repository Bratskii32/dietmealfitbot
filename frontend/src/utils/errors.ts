export function parseApiError(err: unknown): { message: string; code?: string; retryable: boolean } {
  if (!navigator.onLine) {
    return { message: 'Нет подключения к интернету', code: 'offline', retryable: true };
  }

  const e = err as { error?: string; message?: string; status?: number };
  if (e.error === 'service_unavailable' || e.status === 503) {
    return {
      message: 'Сервис временно недоступен. Попробуй через минуту 🔄',
      code: 'service_unavailable',
      retryable: true,
    };
  }

  return {
    message: e.message || e.error || 'Что-то пошло не так',
    retryable: false,
  };
}
