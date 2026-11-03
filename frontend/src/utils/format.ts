import type { Money, OrderStatus, RefundStatus, TransactionStatus } from '../types';

export function formatMoney(value: Money | null | undefined, currency = 'BOB'): string {
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(Number(numeric)) ? Number(numeric) : 0);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPercent(value: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PAID: 'Pagada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
  PARTIALLY_REFUNDED: 'Parcialmente reembolsada',
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  SUCCEEDED: 'Aprobada',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

export const refundStatusLabels: Record<RefundStatus, string> = {
  PENDING: 'Pendiente',
  SUCCEEDED: 'Aprobado',
  FAILED: 'Fallido',
};

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Operador',
  VIEWER: 'Consulta',
};

export function statusClass(value: string): string {
  return `badge badge-${value.toLowerCase().replace(/_/g, '-')}`;
}

export function customerName(customer?: {
  first_name?: string;
  last_name?: string;
} | null): string {
  if (!customer) return '—';
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—';
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  return { startDate: toDateInput(start), endDate: toDateInput(end) };
}
