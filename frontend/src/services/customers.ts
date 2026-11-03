import { api } from '../api/client';
import type { Customer, Paginated } from '../types';
import { unwrap } from './utils';

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomerPayload {
  first_name: string;
  last_name: string;
  email?: string;
  store_id?: number;
  address_id?: number;
  active?: boolean;
}

export const customersService = {
  async list(filters: CustomerFilters = {}): Promise<Paginated<Customer>> {
    const response = await api.get('/customers', { params: filters });
    return response.data as Paginated<Customer>;
  },

  async get(id: number): Promise<Customer> {
    const response = await api.get(`/customers/${id}`);
    return unwrap<Customer>(response);
  },

  async create(payload: CustomerPayload): Promise<Customer> {
    const response = await api.post('/customers', payload);
    return unwrap<Customer>(response);
  },

  async update(id: number, payload: Partial<CustomerPayload>): Promise<Customer> {
    const response = await api.patch(`/customers/${id}`, payload);
    return unwrap<Customer>(response);
  },
};
