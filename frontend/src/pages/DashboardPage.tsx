import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { SalesChart } from '../components/SalesChart';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { reportsService } from '../services/reports';
import type { DashboardMetrics } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import {
  customerName,
  formatDateTime,
  formatMoney,
  transactionStatusLabels,
} from '../utils/format';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMetrics(await reportsService.dashboard());
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo de la pasarela de demostración."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            ↻ Actualizar
          </button>
        }
      />

      {loading && !metrics ? (
        <Loading />
      ) : metrics ? (
        <>
          <div className="stats-grid">
            <StatCard
              label="Ingresos netos"
              value={formatMoney(metrics.revenue.net)}
              hint={`${metrics.revenue.transactions_count} transacciones aprobadas`}
              icon="💵"
              tone="success"
            />
            <StatCard
              label="Órdenes totales"
              value={metrics.orders.total}
              hint={`${metrics.orders.paid} pagadas · ${metrics.orders.pending} pendientes`}
              icon="🧾"
              tone="info"
            />
            <StatCard
              label="Reembolsos"
              value={formatMoney(metrics.refunds.total)}
              hint={`${metrics.refunds.count} reembolso(s) aprobado(s)`}
              icon="↩"
              tone="warning"
            />
            <StatCard
              label="Pagos fallidos"
              value={metrics.failed_payments}
              hint={`${metrics.catalog.customers} clientes · ${metrics.catalog.films} películas`}
              icon="⚠"
              tone={metrics.failed_payments > 0 ? 'danger' : 'default'}
            />
          </div>

          <div className="dashboard-grid">
            <SalesChart points={metrics.sales_timeline} />

            <div className="panel">
              <div className="panel-header">
                <h3>Estado de órdenes</h3>
              </div>
              <div className="status-summary">
                {[
                  ['Pagadas', metrics.orders.paid, 'paid'],
                  ['Pendientes', metrics.orders.pending, 'pending'],
                  ['Canceladas', metrics.orders.cancelled, 'cancelled'],
                ].map(([label, value, tone]) => (
                  <div className="status-summary-row" key={String(label)}>
                    <StatusBadge status={String(tone)} label={String(label)} />
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <p className="muted small">
                Los importes se calculan a partir de transacciones aprobadas y
                reembolsos exitosos.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Transacciones recientes</h3>
              <Link to="/payments" className="link">
                Ver todas →
              </Link>
            </div>

            {metrics.recent_transactions.length === 0 ? (
              <EmptyState
                title="Aún no hay transacciones"
                description="Cree una orden y procese un pago simulado para ver actividad."
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Cliente</th>
                      <th>Método</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent_transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td>
                          <Link to={`/payments?focus=${txn.id}`} className="mono link">
                            {txn.transaction_ref}
                          </Link>
                        </td>
                        <td>{customerName(txn.order?.customer)}</td>
                        <td>{txn.payment_method?.name || '—'}</td>
                        <td>{formatMoney(txn.amount, txn.currency)}</td>
                        <td>
                          <StatusBadge
                            status={txn.status}
                            label={transactionStatusLabels[txn.status]}
                          />
                        </td>
                        <td>{formatDateTime(txn.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState title="No se pudieron cargar las métricas" />
      )}
    </>
  );
}
