import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ordersService } from '../services/orders';
import { customersService } from '../services/customers';
import { filmsService } from '../services/films';
import type {
  Customer,
  Film,
  Order,
  OrderStatus,
  Paginated,
} from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import {
  customerName,
  formatDateTime,
  formatMoney,
  orderStatusLabels,
} from '../utils/format';

const statusOptions: Array<{ value: '' | OrderStatus; label: string }> = [
  { value: '', label: 'Todos los estados' },
  ...Object.entries(orderStatusLabels).map(([value, label]) => ({
    value: value as OrderStatus,
    label,
  })),
];

interface ItemDraft {
  film_id: string;
  quantity: number;
}

export function OrdersPage() {
  const { canOperate } = useAuth();
  const toast = useToast();

  const [result, setResult] = useState<Paginated<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [films, setFilms] = useState<Film[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([{ film_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await ordersService.list({ page, limit: 10, status: status || undefined }),
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

  const openCreate = async () => {
    setCreateOpen(true);
    setFormError(null);
    setItems([{ film_id: '', quantity: 1 }]);
    setCustomerId('');
    setNotes('');

    try {
      const [customerResult, filmResult] = await Promise.all([
        customersService.list({ page: 1, limit: 100 }),
        filmsService.list({ page: 1, limit: 100 }),
      ]);
      setCustomers(customerResult.data);
      setFilms(filmResult.data);

      if (customerResult.data[0]) {
        setCustomerId(String(customerResult.data[0].customer_id));
      }
    } catch (error) {
      toast.error(getApiError(error));
    }
  };

  const filmMap = useMemo(
    () => new Map(films.map((film) => [String(film.film_id), film])),
    [films],
  );

  const estimatedTotal = items.reduce((sum, item) => {
    const film = filmMap.get(item.film_id);
    return sum + (film ? Number(film.rental_rate) * item.quantity : 0);
  }, 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const validItems = items
        .filter((item) => item.film_id)
        .map((item) => ({
          film_id: Number(item.film_id),
          quantity: Math.max(1, Number(item.quantity)),
        }));

      if (!customerId) throw new Error('Seleccione un cliente');
      if (validItems.length === 0) throw new Error('Añada al menos una película');

      const order = await ordersService.create({
        customer_id: Number(customerId),
        items: validItems,
        notes: notes.trim() || undefined,
      });

      toast.success(`Orden ${order.order_number} creada`);
      setCreateOpen(false);
      await load();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await ordersService.cancel(cancelTarget.id);
      toast.success(`Orden ${cancelTarget.order_number} cancelada`);
      setCancelTarget(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Órdenes"
        subtitle="Gestión de órdenes de compra y su estado de pago."
        actions={
          canOperate ? (
            <button type="button" className="btn btn-primary" onClick={() => void openCreate()}>
              + Nueva orden
            </button>
          ) : undefined
        }
      />

      <div className="filters-bar">
        <select
          className="select"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as '' | OrderStatus);
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
          {result ? `${result.meta.total} orden(es)` : '—'}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            title="Sin órdenes"
            description="Cree una orden para comenzar el flujo de pago."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Creada</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`} className="mono link">
                          {order.order_number}
                        </Link>
                      </td>
                      <td>{customerName(order.customer)}</td>
                      <td>{order._count?.order_items ?? 0}</td>
                      <td>
                        <strong>{formatMoney(order.total, order.currency)}</strong>
                      </td>
                      <td>
                        <StatusBadge
                          status={order.status}
                          label={orderStatusLabels[order.status]}
                        />
                      </td>
                      <td>{formatDateTime(order.created_at)}</td>
                      <td className="actions-cell">
                        <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                          Ver
                        </Link>
                        {canOperate && order.status === 'PENDING' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCancelTarget(order)}
                          >
                            Cancelar
                          </button>
                        )}
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
        open={createOpen}
        title="Nueva orden"
        onClose={() => setCreateOpen(false)}
        wide
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="order-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Creando…' : 'Crear orden'}
            </button>
          </>
        }
      >
        <form id="order-form" className="form-stack" onSubmit={submit}>
          <label className="field">
            <span>Cliente *</span>
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              required
            >
              <option value="">Seleccione un cliente</option>
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  #{customer.customer_id} · {customer.first_name} {customer.last_name}
                </option>
              ))}
            </select>
          </label>

          <div className="items-editor">
            <div className="items-editor-header">
              <span>Películas *</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setItems((current) => [...current, { film_id: '', quantity: 1 }])
                }
              >
                + Añadir línea
              </button>
            </div>

            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <select
                  className="item-film"
                  value={item.film_id}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, film_id: event.target.value }
                          : row,
                      ),
                    )
                  }
                >
                  <option value="">Seleccione película</option>
                  {films.map((film) => (
                    <option key={film.film_id} value={film.film_id}>
                      {film.title} · {formatMoney(film.rental_rate)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={item.quantity}
                  onChange={(event) =>
                    setItems((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, quantity: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                />
                <span className="item-subtotal">
                  {formatMoney(
                    filmMap.get(item.film_id)
                      ? Number(filmMap.get(item.film_id)?.rental_rate) * item.quantity
                      : 0,
                  )}
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    setItems((current) =>
                      current.length === 1
                        ? current
                        : current.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                  aria-label="Quitar línea"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <label className="field">
            <span>Notas</span>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Pedido de demostración"
            />
          </label>

          <div className="total-line">
            <span>Total estimado</span>
            <strong>{formatMoney(estimatedTotal)}</strong>
          </div>
          <p className="muted small">
            Los precios se recalculan en el servidor con la tarifa vigente de cada
            película.
          </p>

          {formError && <div className="form-error">{formError}</div>}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar orden"
        message={`¿Confirma la cancelación de ${cancelTarget?.order_number}? Esta acción no se puede deshacer.`}
        confirmLabel="Cancelar orden"
        danger
        busy={cancelling}
        onConfirm={() => void confirmCancel()}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}
