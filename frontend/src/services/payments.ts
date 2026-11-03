import { api } from '../api/client';
import type {
  Paginated,
  PaymentMethod,
  PaymentTransaction,
  TransactionStatus,
} from '../types';
import { unwrap } from './utils';

export interface PaymentFilters {
  page?: number;
  limit?: number;
  status?: TransactionStatus | '';
  orderId?: string;
}

export interface PaymentPayload {
  order_id: string;
  amount: number;
  payment_method_id: string;
  payer_identifier?: string;
  test_token?: string;
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const paymentsService = {
  async list(filters: PaymentFilters = {}): Promise<Paginated<PaymentTransaction>> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
    );
    const response = await api.get('/payments', { params });
    return response.data as Paginated<PaymentTransaction>;
  },

  async get(id: string): Promise<PaymentTransaction> {
    const response = await api.get(`/payments/${id}`);
    return unwrap<PaymentTransaction>(response);
  },

  async methods(): Promise<PaymentMethod[]> {
    const response = await api.get('/payments/methods');
    return unwrap<PaymentMethod[]>(response);
  },

  async pay(
    payload: PaymentPayload,
    idempotencyKey: string,
  ): Promise<PaymentTransaction> {
    const response = await api.post('/payments', payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });
    return unwrap<PaymentTransaction>(response);
  },
};
