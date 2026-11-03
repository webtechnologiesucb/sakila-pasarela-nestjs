import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { reportsService } from '../services/reports';
import type { RefundsReport } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import {
  customerName,
  formatDateTime,
  formatMoney,
  refundStatusLabels,
} from '../utils/format';

export function RefundsPage() {
  const toast = useToast();
  const [report, setReport] = useState<RefundsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await reportsService.refunds());
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
        title="Reembolsos"
        subtitle="Historial de reembolsos parciales y totales."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            ↻ Actualizar
          </button>
        }
      />

      {loading && !report ? (
        <Loading />
      ) : report ? (
        <>
          <div className="stats-grid stats-grid-3">
            <StatCard
              label="Total reembolsado"
              value={formatMoney(report.summary.total_refunded)}
              hint={`${report.summary.count} reembolso(s) aprobado(s)`}
              icon="↩"
              tone="warning"
            />
            {report.summary.by_status.map((entry) => (
              <StatCard
                key={entry.status}
                label={refundStatusLabels[entry.status]}
                value={entry.count}
                hint="Registros por estado"
                icon={
                  entry.status === 'SUCCEEDED'
                    ? '✓'
                    : entry.status === 'FAILED'
                      ? '×'
                      : '…'
                }
                tone={
                  entry.status === 'SUCCEEDED'
                    ? 'success'
                    : entry.status === 'FAILED'
                      ? 'danger'
                      : 'default'
                }
              />
            ))}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Detalle de reembolsos</h3>
              <span className="muted small">{report.refunds.length} registro(s)</span>
            </div>

            {report.refunds.length === 0 ? (
              <EmptyState
                title="Sin reembolsos"
                description="Los reembolsos se crean desde una transacción aprobada."
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Referencia</th>
                      <th>Transacción</th>
                      <th>Orden</th>
                      <th>Cliente</th>
                      <th>Importe</th>
                      <th>Estado</th>
                      <th>Motivo</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.refunds.map((refund) => (
                      <tr key={refund.id}>
                        <td className="mono">{refund.reference}</td>
                        <td>
                          <Link
                            to={`/payments?focus=${refund.transaction_id}`}
                            className="mono link"
                          >
                            {refund.transaction?.transaction_ref || '—'}
                          </Link>
                        </td>
                        <td>
                          {refund.transaction?.order ? (
                            <Link
                              to={`/orders/${refund.transaction.order.id}`}
                              className="link"
                            >
                              {refund.transaction.order.order_number}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{customerName(refund.transaction?.order?.customer)}</td>
                        <td>
                          <strong>{formatMoney(refund.amount)}</strong>
                        </td>
                        <td>
                          <StatusBadge
                            status={refund.status}
                            label={refundStatusLabels[refund.status]}
                          />
                        </td>
                        <td className="truncate" title={refund.reason}>
                          {refund.reason}
                        </td>
                        <td>{formatDateTime(refund.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState title="No se pudo cargar el reporte" />
      )}
    </>
  );
}
