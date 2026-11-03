import { api } from '../api/client';
import type { Refund } from '../types';
import { unwrap } from './utils';

export interface RefundPayload {
  amount: number;
  reason: string;
}

export const refundsService = {
  async create(transactionId: string, payload: RefundPayload): Promise<Refund> {
    const response = await api.post(`/payments/${transactionId}/refunds`, payload);
    return unwrap<Refund>(response);
  },

  async listByTransaction(transactionId: string): Promise<Refund[]> {
    const response = await api.get(`/payments/${transactionId}/refunds`);
    return unwrap<Refund[]>(response);
  },
};
