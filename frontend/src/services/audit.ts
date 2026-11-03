import { api } from '../api/client';
import type { AuditLog, Paginated } from '../types';
import { unwrap } from './utils';

export interface AuditFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export const auditService = {
  async list(filters: AuditFilters = {}): Promise<Paginated<AuditLog>> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => Boolean(value)),
    );
    const response = await api.get('/audit-logs', { params });
    return response.data as Paginated<AuditLog>;
  },

  async get(id: string): Promise<AuditLog> {
    const response = await api.get(`/audit-logs/${id}`);
    return unwrap<AuditLog>(response);
  },
};
