import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { customersService } from '../services/customers';
import type { Customer, Paginated } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import { formatDate } from '../utils/format';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  store_id: string;
  address_id: string;
  active: boolean;
}

const emptyForm: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  store_id: '1',
  address_id: '5',
  active: true,
};

export function CustomersPage() {
  const { canOperate } = useAuth();
  const toast = useToast();

  const [result, setResult] = useState<Paginated<Customer> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await customersService.list({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
        }),
      );
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || '',
      store_id: String(customer.store_id),
      address_id: String(customer.address_id),
      active: customer.active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const basePayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || undefined,
      };

      if (editing) {
        await customersService.update(editing.customer_id, {
          ...basePayload,
          active: form.active,
        });
        toast.success('Cliente actualizado');
      } else {
        await customersService.create({
          ...basePayload,
          store_id: Number(form.store_id),
          address_id: Number(form.address_id),
        });
        toast.success('Cliente creado');
      }

      setModalOpen(false);
      await load();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Clientes Sakila disponibles para crear órdenes y pagos."
        actions={
          canOperate ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nuevo cliente
            </button>
          ) : undefined
        }
      />

      <div className="filters-bar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar por nombre, apellido o email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <span className="muted small">
          {result ? `${result.meta.total} cliente(s)` : '—'}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            title="Sin clientes"
            description="Ajuste la búsqueda o cree un nuevo cliente."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Ciudad / País</th>
                    <th>Tienda</th>
                    <th>Órdenes</th>
                    <th>Estado</th>
                    <th>Alta</th>
                    {canOperate && <th />}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((customer) => (
                    <tr key={customer.customer_id}>
                      <td className="mono muted">#{customer.customer_id}</td>
                      <td>
                        <strong>
                          {customer.first_name} {customer.last_name}
                        </strong>
                      </td>
                      <td>{customer.email || '—'}</td>
                      <td>
                        {customer.address?.city?.city || '—'}
                        {customer.address?.city?.country
                          ? `, ${customer.address.city.country.country}`
                          : ''}
                      </td>
                      <td>{customer.store_id}</td>
                      <td>{customer._count?.orders ?? 0}</td>
                      <td>
                        <StatusBadge
                          status={customer.active ? 'APPROVED' : 'CANCELLED'}
                          label={customer.active ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td>{formatDate(customer.create_date)}</td>
                      {canOperate && (
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(customer)}
                          >
                            Editar
                          </button>
                        </td>
                      )}
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
        open={modalOpen}
        title={editing ? `Editar cliente #${editing.customer_id}` : 'Nuevo cliente'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="customer-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="customer-form" className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Nombre *</span>
            <input
              value={form.first_name}
              maxLength={45}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Apellido *</span>
            <input
              value={form.last_name}
              maxLength={45}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              required
            />
          </label>
          <label className="field field-span-2">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Tienda</span>
            <select
              value={form.store_id}
              onChange={(event) => setForm({ ...form, store_id: event.target.value })}
            >
              <option value="1">Tienda 1</option>
              <option value="2">Tienda 2</option>
            </select>
          </label>
          <label className="field">
            <span>ID de dirección</span>
            <input
              type="number"
              min={1}
              value={form.address_id}
              onChange={(event) => setForm({ ...form, address_id: event.target.value })}
            />
          </label>
          {editing && (
            <label className="checkbox-field field-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              <span>Cliente activo</span>
            </label>
          )}
          {formError && <div className="form-error field-span-2">{formError}</div>}
        </form>
      </Modal>
    </>
  );
}
