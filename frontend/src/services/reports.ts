import { api } from '../api/client';
import type {
  DashboardMetrics,
  PaymentsReport,
  RefundsReport,
  SalesReport,
} from '../types';
import { unwrap } from './utils';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export const reportsService = {
  async dashboard(): Promise<DashboardMetrics> {
    const response = await api.get('/reports/dashboard');
    return unwrap<DashboardMetrics>(response);
  },

  async sales(range: DateRange = {}): Promise<SalesReport> {
    const params = Object.fromEntries(
      Object.entries(range).filter(([, value]) => Boolean(value)),
    );
    const response = await api.get('/reports/sales', { params });
    return unwrap<SalesReport>(response);
  },

  async payments(): Promise<PaymentsReport> {
    const response = await api.get('/reports/payments');
    return unwrap<PaymentsReport>(response);
  },

  async refunds(): Promise<RefundsReport> {
    const response = await api.get('/reports/refunds');
    return unwrap<RefundsReport>(response);
  },
};
