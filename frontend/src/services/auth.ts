import { api } from '../api/client';
import type { AuthSession, User } from '../types';
import { unwrap } from './utils';

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await api.post('/auth/login', { email, password });
    return unwrap<AuthSession>(response);
  },

  async me(): Promise<User> {
    const response = await api.get('/auth/me');
    return unwrap<User>(response);
  },
};
