import { api } from '../api/client';
import type { Paginated, User, UserRole } from '../types';
import { unwrap } from './utils';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole | '';
  isActive?: boolean | '';
}

export interface UserPayload {
  email?: string;
  name: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

export const usersService = {
  async list(filters: UserFilters = {}): Promise<Paginated<User>> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
    );
    const response = await api.get('/users', { params });
    return response.data as Paginated<User>;
  },

  async create(payload: UserPayload): Promise<User> {
    const response = await api.post('/users', payload);
    return unwrap<User>(response);
  },

  async update(id: string, payload: UserPayload): Promise<User> {
    const response = await api.patch(`/users/${id}`, payload);
    return unwrap<User>(response);
  },

  async deactivate(id: string): Promise<User> {
    const response = await api.patch(`/users/${id}/deactivate`);
    return unwrap<User>(response);
  },
};
