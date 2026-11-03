import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { ordersService } from '../services/orders';
import { paymentsService, createIdempotencyKey } from '../services/payments';
import { refundsService } from '../services/refunds';
import type {
  Order,
  PaymentMethod,
  PaymentTransaction,
} from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import {
  customerName,
  formatDateTime,
  formatMoney,
  orderStatusLabels,
  transactionStatusLabels,
} from '../utils/format';

const testTokens = [
  { value: '', label: 'Sin token (resultado determinista)' },
  { value: 'tok_demo_approved_4242', label: 'Aprobado siempre' },
  { value: 'tok_demo_insufficient_9999', label: 'Fondos insuficientes' },
  { value: 'tok_demo_invalid_0000', label: 'Datos inválidos' },
  { value: 'tok_demo_error_5678', label: 'Error del proveedor' },
];

const MOBILE_WALLET_CODES = ['TIGO_MONEY', 'ENTEL_MONEY'];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canOperate } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [payOpen, setPayOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [payerIdentifier, setPayerIdentifier] = useState('');
  const [testToken, setTestToken] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const [refundTxn, setRefundTxn] = useState<PaymentTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setOrder(await ordersService.get(id));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openPayment = async () => {
    if (!order) return;
    setPayOpen(true);
    setPayError(null);
    setTestToken('');
    setPayerIdentifier('');
    try {
      const available = await paymentsService.methods();
      setMethods(available);
      setMethodId(
        available.find((method) => method.code === 'QR_SIMPLE')?.id ||
          available[0]?.id ||
          '',
      );
    } catch (error) {
      setPayError(getApiError(error));
    }
  };

  const selectedMethod = methods.find((method) => method.id === methodId);
  const requiresPayerIdentifier = Boolean(
    selectedMethod && MOBILE_WALLET_CODES.includes(selectedMethod.code),
  );

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!order) return;
    setPaying(true);
    setPayError(null);

    try {
      const transaction = await paymentsService.pay(
        {
          order_id: order.id,
          amount: Number(order.total),
          payment_method_id: methodId,
          payer_identifier: requiresPayerIdentifier
            ? payerIdentifier.trim() || undefined
            : undefined,
          test_token: testToken || undefined,
        },
        createIdempotencyKey(),
      );

      if (transaction.status === 'SUCCEEDED') {
        toast.success('Pago aprobado');
      } else {
        toast.error(
          `Pago ${transactionStatusLabels[transaction.status].toLowerCase()}: ${
            transaction.response_message || transaction.response_code
          }`,
        );
      }

      setPayOpen(false);
      await load();
    } catch (error) {
      setPayError(getApiError(error));
    } finally {
      setPaying(false);
    }
  };

  const openRefund = (transaction: PaymentTransaction) => {
    const refunded = (transaction.refunds || [])
      .filter((refund) => refund.status === 'SUCCEEDED')
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const available = Math.max(0, Number(transaction.amount) - refunded);

    setRefundTxn(transaction);
    setRefundAmount(available.toFixed(2));
    setRefundReason('');
    setRefundError(null);
  };

  const submitRefund = async (event: FormEvent) => {
    event.preventDefault();
    if (!refundTxn) return;
    setRefunding(true);
    setRefundError(null);

    try {
      const refund = await refundsService.create(refundTxn.id, {
        amount: Number(refundAmount),
        reason: refundReason.trim(),
      });

      if (refund.status === 'SUCCEEDED') {
        toast.success('Reembolso aprobado');
      } else {
        toast.error(`Reembolso no aprobado: ${refund.response_message || refund.status}`);
      }

      setRefundTxn(null);
      await load();
    } catch (error) {
      setRefundError(getApiError(error));
    } finally {
      setRefunding(false);
    }
  };

  if (loading) return <Loading label="Cargando orden…" />;
  if (!order) {
    return (
      <EmptyState
        title="Orden no encontrada"
        description="La orden solicitada no existe o fue eliminada."
      />
    );
  }

  const canPay =
    canOperate && (order.status === 'PENDING' || order.status === 'CONFIRMED');
  const transactions = order.payment_transactions || [];

  return (
    <>
      <PageHeader
        title={order.order_number}
        subtitle={`Creada el ${formatDateTime(order.created_at)} · ${customerName(
          order.customer,
        )}`}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/orders')}>
              ← Volver
            </button>
            {canPay && (
              <button type="button" className="btn btn-primary" onClick={() => void openPayment()}>
                💳 Procesar pago
              </button>
            )}
          </>
        }
      />

      <div className="detail-cards">
        <div className="panel">
          <div className="panel-header">
            <h3>Resumen</h3>
            <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
          </div>
          <dl className="summary-list">
            <div>
              <dt>Cliente</dt>
              <dd>
                <Link to="/customers" className="link">
                  {customerName(order.customer)}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{order.customer?.email || '—'}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            <div>
              <dt>Impuestos</dt>
              <dd>{formatMoney(order.tax, order.currency)}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd className="summary-total">{formatMoney(order.total, order.currency)}</dd>
            </div>
            <div>
              <dt>Notas</dt>
              <dd>{order.notes || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Artículos</h3>
            <span className="muted small">{order.order_items?.length || 0} línea(s)</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Película</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.order_items || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.film?.title || `Película #${item.film_id}`}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.unit_price, order.currency)}</td>
                    <td>{formatMoney(item.subtotal, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Transacciones de pago</h3>
          <span className="muted small">{transactions.length} transacción(es)</span>
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            title="Sin pagos registrados"
            description="Procese un pago simulado para esta orden."
          />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Referencia</th>
                  <th>Método</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Respuesta</th>
                  <th>Fecha</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const refunded = (transaction.refunds || [])
                    .filter((refund) => refund.status === 'SUCCEEDED')
                    .reduce((sum, refund) => sum + Number(refund.amount), 0);
                  const canRefund =
                    canOperate &&
                    transaction.status === 'SUCCEEDED' &&
                    refunded < Number(transaction.amount);

                  return (
                    <tr key={transaction.id}>
                      <td className="mono">{transaction.transaction_ref}</td>
                      <td>
                        {transaction.payment_method?.name || '—'}
                        {transaction.provider_reference && (
                          <div className="muted small mono">
                            {transaction.provider_reference}
                          </div>
                        )}
                      </td>
                      <td>{formatMoney(transaction.amount, transaction.currency)}</td>
                      <td>
                        <StatusBadge
                          status={transaction.status}
                          label={transactionStatusLabels[transaction.status]}
                        />
                      </td>
                      <td>
                        <span className="muted small">
                          {transaction.response_message || transaction.response_code || '—'}
                        </span>
                      </td>
                      <td>{formatDateTime(transaction.created_at)}</td>
                      <td className="actions-cell">
                        {canRefund && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openRefund(transaction)}
                          >
                            Reembolsar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={payOpen}
        title="Procesar pago simulado"
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPayOpen(false)}
              disabled={paying}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="payment-form"
              className="btn btn-primary"
              disabled={paying || !methodId}
            >
              {paying ? 'Procesando…' : `Pagar ${formatMoney(order.total, order.currency)}`}
            </button>
          </>
        }
      >
        <form id="payment-form" className="form-stack" onSubmit={submitPayment}>
          <div className="demo-callout">
            ⚠️ Pago de demostración. No se procesa dinero real.
          </div>

          <label className="field">
            <span>Importe (total de la orden)</span>
            <input value={formatMoney(order.total, order.currency)} readOnly />
          </label>

          <label className="field">
            <span>Método de pago *</span>
            <select
              value={methodId}
              onChange={(event) => {
                setMethodId(event.target.value);
                setPayerIdentifier('');
              }}
              required
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
            {selectedMethod?.provider && (
              <small className="muted">
                Proveedor: {selectedMethod.provider}
              </small>
            )}
          </label>

          {requiresPayerIdentifier && (
            <label className="field">
              <span>Celular del pagador *</span>
              <input
                value={payerIdentifier}
                onChange={(event) => setPayerIdentifier(event.target.value)}
                placeholder="71234567"
                inputMode="tel"
                autoComplete="tel"
                required
              />
              <small className="muted">
                Tigo Money y Entel Money requieren 8 dígitos que inicien con 6 o 7
                (+591 opcional). El número se almacena enmascarado.
              </small>
            </label>
          )}

          <label className="field">
            <span>Token de prueba</span>
            <select value={testToken} onChange={(event) => setTestToken(event.target.value)}>
              {testTokens.map((token) => (
                <option key={token.value || 'none'} value={token.value}>
                  {token.label}
                </option>
              ))}
            </select>
          </label>

          <p className="muted small">
            Cada intento genera una nueva clave de idempotencia. Reintentar con la
            misma clave devuelve el resultado original.
          </p>

          {payError && <div className="form-error">{payError}</div>}
        </form>
      </Modal>

      <Modal
        open={Boolean(refundTxn)}
        title="Solicitar reembolso"
        onClose={() => setRefundTxn(null)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRefundTxn(null)}
              disabled={refunding}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="refund-form"
              className="btn btn-primary"
              disabled={refunding}
            >
              {refunding ? 'Procesando…' : 'Solicitar reembolso'}
            </button>
          </>
        }
      >
        <form id="refund-form" className="form-stack" onSubmit={submitRefund}>
          <dl className="summary-list">
            <div>
              <dt>Transacción</dt>
              <dd className="mono">{refundTxn?.transaction_ref}</dd>
            </div>
            <div>
              <dt>Importe original</dt>
              <dd>{formatMoney(refundTxn?.amount)}</dd>
            </div>
          </dl>

          <label className="field">
            <span>Importe a reembolsar *</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={Number(refundTxn?.amount)}
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Motivo *</span>
            <textarea
              rows={3}
              minLength={5}
              maxLength={500}
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              placeholder="Motivo del reembolso (mínimo 5 caracteres)"
              required
            />
          </label>

          {refundError && <div className="form-error">{refundError}</div>}
        </form>
      </Modal>
    </>
  );
}
