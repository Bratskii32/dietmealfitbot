declare module 'yookassa' {
  interface YooKassaPayment {
    id: string;
    status: string;
    amount?: { value: string; currency: string };
    metadata?: Record<string, string>;
    confirmation?: { confirmation_url?: string };
    isSucceeded: boolean;
    confirmationUrl?: string;
  }

  class YooKassa {
    constructor(options: { shopId: string; secretKey: string });
    createPayment(payload: Record<string, unknown>, idempotenceKey?: string): Promise<YooKassaPayment>;
    getPayment(paymentId: string, idempotenceKey?: string): Promise<YooKassaPayment>;
  }

  export = YooKassa;
}
