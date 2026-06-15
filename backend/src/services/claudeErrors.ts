export class ServiceUnavailableError extends Error {
  code = 'service_unavailable';
  constructor(message = 'Сервис временно недоступен') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export function handleClaudeError(error: unknown): never {
  console.error('Claude API error:', error);
  const err = error as { status?: number; error?: { type?: string } };
  if (err?.status === 429 || err?.error?.type === 'rate_limit_error') {
    throw new ServiceUnavailableError();
  }
  throw new ServiceUnavailableError();
}

export function serviceUnavailableResponse(res: import('express').Response) {
  return res.status(503).json({
    error: 'service_unavailable',
    message: 'Сервис временно недоступен. Попробуй через минуту 🔄',
  });
}
