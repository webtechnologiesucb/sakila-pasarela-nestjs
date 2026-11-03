import { api } from '../api/client';
import type { Order, OrderStatus, Paginated } from '../types';
import { unwrap } from './utils';

export interface OrderFilters {
  page?: number;
  limit?: number;
  customerId?: number;
  status?: OrderStatus | '';
}

export interface CreateOrderPayload {
  customer_id: number;
  items: Array<{ film_id: number; quantity: number }>;
  notes?: string;
}

export const ordersService = {
  async list(filters: OrderFilters = {}): Promise<Paginated<Order>> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
    );
    const response = await api.get('/orders', { params });
    return response.data as Paginated<Order>;
  },

  async get(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return unwrap<Order>(response);
  },

  async create(payload: CreateOrderPayload): Promise<Order> {
    const response = await api.post('/orders', payload);
    return unwrap<Order>(response);
  },

  async cancel(id: string): Promise<Order> {
    const response = await api.post(`/orders/${id}/cancel`);
    return unwrap<Order>(response);
  },
};
