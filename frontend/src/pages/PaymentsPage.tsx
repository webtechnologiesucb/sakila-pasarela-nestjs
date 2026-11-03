import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { paymentsService } from '../services/payments';
import type { Paginated, PaymentTransaction, TransactionStatus } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import {
  customerName,
  formatDateTime,
  formatMoney,
  transactionStatusLabels,
} from '../utils/format';

const statusOptions: Array<{ value: '' | TransactionStatus; label: string }> = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(transactionStatusLabels).map(([value, label]) => ({
    value: value as TransactionStatus,
    label,
  })),
];

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [result, setResult] = useState<Paginated<PaymentTransaction> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | TransactionStatus>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await paymentsService.list({
          page,
          limit: 10,
          status: status || undefined,
        }),
      );
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, status, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        setSelected(await paymentsService.get(id));
      } catch (error) {
        toast.error(getApiError(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus) {
      void openDetail(focus);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, openDetail, setSearchParams]);

  return (
    <>
      <PageHeader
        title="Pagos"
        subtitle="Transacciones simuladas procesadas por la pasarela."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            ↻ Actualizar
          </button>
        }
      />

      <div className="filters-bar">
        <select
          className="select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as '' | TransactionStatus);
            setPage(1);
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="muted small">
          {result ? `${result.meta.total} transacción(es)` : '—'}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            title="Sin transacciones"
            description="Procese un pago desde el detalle de una orden."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th>Importe</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="mono">{transaction.transaction_ref}</td>
                      <td>
                        {transaction.order ? (
                          <Link to={`/orders/${transaction.order_id}`} className="link mono">
                            {transaction.order.order_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{customerName(transaction.order?.customer)}</td>
                      <td>{transaction.payment_method?.name || '—'}</td>
                      <td>
                        <strong>
                          {formatMoney(transaction.amount, transaction.currency)}
                        </strong>
                      </td>
                      <td>
                        <StatusBadge
                          status={transaction.status}
                          label={transactionStatusLabels[transaction.status]}
                        />
                      </td>
                      <td>{formatDateTime(transaction.created_at)}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void openDetail(transaction.id)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              total={result.meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Modal
        open={Boolean(selected) || detailLoading}
        title="Detalle de transacción"
        onClose={() => setSelected(null)}
        wide
      >
        {detailLoading || !selected ? (
          <Loading label="Cargando transacción…" />
        ) : (
          <div className="detail-stack">
            <div className="detail-grid">
              <div>
                <span className="detail-label">Referencia</span>
                <strong className="mono">{selected.transaction_ref}</strong>
              </div>
              <div>
                <span className="detail-label">Estado</span>
                <StatusBadge
                  status={selected.status}
                  label={transactionStatusLabels[selected.status]}
                />
              </div>
              <div>
                <span className="detail-label">Importe</span>
                <strong>{formatMoney(selected.amount, selected.currency)}</strong>
              </div>
              <div>
                <span className="detail-label">Método</span>
                <strong>{selected.payment_method?.name || '—'}</strong>
              </div>
              {selected.payment_method?.provider && (
                <div>
                  <span className="detail-label">Proveedor</span>
                  <strong>{selected.payment_method.provider}</strong>
                </div>
              )}
              {selected.provider_reference && (
                <div>
                  <span className="detail-label">Referencia del proveedor</span>
                  <strong className="mono">{selected.provider_reference}</strong>
                </div>
              )}
              {selected.payer_identifier && (
                <div>
                  <span className="detail-label">Pagador</span>
                  <strong className="mono">{selected.payer_identifier}</strong>
                </div>
              )}
              <div>
                <span className="detail-label">Código respuesta</span>
                <strong className="mono">{selected.response_code || '—'}</strong>
              </div>
              <div>
                <span className="detail-label">Fecha</span>
                <strong>{formatDateTime(selected.created_at)}</strong>
              </div>
            </div>

            <div>
              <span className="detail-label">Mensaje del proveedor</span>
              <p>{selected.response_message || '—'}</p>
            </div>

            <div className="panel panel-nested">
              <div className="panel-header">
                <h3>Reembolsos</h3>
                <span className="muted small">
                  {selected.refunds?.length || 0} registro(s)
                </span>
              </div>
              {!selected.refunds || selected.refunds.length === 0 ? (
                <p className="muted">Esta transacción no tiene reembolsos.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Importe</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.refunds.map((refund) => (
                        <tr key={refund.id}>
                          <td className="mono">{refund.reference}</td>
                          <td>{formatMoney(refund.amount, selected.currency)}</td>
                          <td>
                            <StatusBadge status={refund.status} />
                          </td>
                          <td>{refund.reason}</td>
                          <td>{formatDateTime(refund.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions-inline">
              <Link
                to={`/orders/${selected.order_id}`}
                className="btn btn-ghost"
                onClick={() => setSelected(null)}
              >
                Ver orden asociada →
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
