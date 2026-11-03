import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SalesChart } from '../components/SalesChart';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { reportsService } from '../services/reports';
import type { PaymentsReport, RefundsReport, SalesReport } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import {
  buildDateRange,
  formatDate,
  formatDateTime,
  formatMoney,
  transactionStatusLabels,
} from '../utils/format';

export function ReportsPage() {
  const toast = useToast();
  const defaultRange = buildDateRange(30);

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [appliedRange, setAppliedRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>(defaultRange);

  const [sales, setSales] = useState<SalesReport | null>(null);
  const [payments, setPayments] = useState<PaymentsReport | null>(null);
  const [refunds, setRefunds] = useState<RefundsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [salesData, paymentsData, refundsData] = await Promise.all([
        reportsService.sales(appliedRange),
        reportsService.payments(),
        reportsService.refunds(),
      ]);
      setSales(salesData);
      setPayments(paymentsData);
      setRefunds(refundsData);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [appliedRange, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyRange = (event: FormEvent) => {
    event.preventDefault();
    setAppliedRange({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Ventas, distribución de pagos y reembolsos agregados."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            ↻ Actualizar
          </button>
        }
      />

      <form className="filters-bar" onSubmit={applyRange}>
        <label className="field field-inline">
          <span>Desde</span>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="field field-inline">
          <span>Hasta</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          Aplicar rango
        </button>
        <span className="muted small">
          Rango aplicado: {formatDate(appliedRange.startDate)} –{' '}
          {formatDate(appliedRange.endDate)}
        </span>
      </form>

      {loading && !sales ? (
        <Loading />
      ) : sales ? (
        <>
          <div className="stats-grid stats-grid-3">
            <StatCard
              label="Ventas aprobadas"
              value={formatMoney(sales.summary.total_amount)}
              hint={`${sales.summary.transaction_count} transacción(es)`}
              icon="💵"
              tone="success"
            />
            <StatCard
              label="Ticket promedio"
              value={formatMoney(sales.summary.average_amount)}
              icon="📈"
              tone="info"
            />
            <StatCard
              label="Reembolsado (acumulado)"
              value={formatMoney(refunds?.summary.total_refunded)}
              hint={`${refunds?.summary.count ?? 0} reembolso(s)`}
              icon="↩"
              tone="warning"
            />
          </div>

          <div className="dashboard-grid">
            <SalesChart points={sales.summary.timeline} title="Ventas del rango" />

            <div className="panel">
              <div className="panel-header">
                <h3>Ventas por método</h3>
              </div>
              {sales.summary.by_method.length === 0 ? (
                <p className="muted">Sin ventas en el rango.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th>Transacciones</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.summary.by_method.map((row) => (
                        <tr key={row.code}>
                          <td>{row.code}</td>
                          <td>{row.count}</td>
                          <td>{formatMoney(row.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="detail-cards">
            <div className="panel">
              <div className="panel-header">
                <h3>Pagos por estado</h3>
              </div>
              {!payments || payments.by_status.length === 0 ? (
                <p className="muted">Sin datos.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Transacciones</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.by_status.map((row) => (
                        <tr key={row.status}>
                          <td>
                            <StatusBadge
                              status={row.status}
                              label={transactionStatusLabels[row.status]}
                            />
                          </td>
                          <td>{row.count}</td>
                          <td>{formatMoney(row.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-header">
                <h3>Pagos por método</h3>
              </div>
              {!payments || payments.by_method.length === 0 ? (
                <p className="muted">Sin datos.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th>Transacciones</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.by_method.map((row) => (
                        <tr key={row.method?.id || row.method?.code || 'unknown'}>
                          <td>{row.method?.name || 'Desconocido'}</td>
                          <td>{row.count}</td>
                          <td>{formatMoney(row.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Transacciones del rango</h3>
              <span className="muted small">
                {sales.transactions.length} transacción(es)
              </span>
            </div>
            {sales.transactions.length === 0 ? (
              <EmptyState
                title="Sin ventas en el rango"
                description="Seleccione otro rango de fechas."
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Orden</th>
                      <th>Método</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="mono">{transaction.transaction_ref}</td>
                        <td className="mono">
                          {transaction.order?.order_number || transaction.order_id}
                        </td>
                        <td>{transaction.payment_method?.name || '—'}</td>
                        <td>{formatMoney(transaction.amount, transaction.currency)}</td>
                        <td>
                          <StatusBadge
                            status={transaction.status}
                            label={transactionStatusLabels[transaction.status]}
                          />
                        </td>
                        <td>{formatDateTime(transaction.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState title="No se pudieron cargar los reportes" />
      )}
    </>
  );
}
