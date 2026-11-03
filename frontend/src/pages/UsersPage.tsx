import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { usersService } from '../services/users';
import type { Paginated, User, UserRole } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { useAuth } from '../store/auth';
import { formatDateTime, roleLabels } from '../utils/format';

const roles: UserRole[] = ['ADMIN', 'STAFF', 'VIEWER'];

interface FormState {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

const emptyForm: FormState = {
  email: '',
  name: '',
  password: '',
  role: 'STAFF',
  is_active: true,
};

export function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [result, setResult] = useState<Paginated<User> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState<'' | UserRole>('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deactivating, setDeactivating] = useState(false);

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
        await usersService.list({
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          role: role || undefined,
        }),
      );
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, role, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
      is_active: user.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      if (editing) {
        await usersService.update(editing.id, {
          name: form.name.trim(),
          role: form.role,
          is_active: form.is_active,
          password: form.password.trim() || undefined,
        });
        toast.success('Usuario actualizado');
      } else {
        await usersService.create({
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success('Usuario creado');
      }

      setModalOpen(false);
      await load();
    } catch (error) {
      setFormError(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await usersService.deactivate(deactivateTarget.id);
      toast.success('Usuario desactivado');
      setDeactivateTarget(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas administrativas con acceso a la pasarela."
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nuevo usuario
          </button>
        }
      />

      <div className="filters-bar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar por email o nombre…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          className="select"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as '' | UserRole);
            setPage(1);
          }}
        >
          <option value="">Todos los roles</option>
          {roles.map((item) => (
            <option key={item} value={item}>
              {roleLabels[item]}
            </option>
          ))}
        </select>
        <span className="muted small">
          {result ? `${result.meta.total} usuario(s)` : '—'}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : !result || result.data.length === 0 ? (
          <EmptyState title="Sin usuarios" description="Ajuste la búsqueda o cree una cuenta." />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        {user.id === currentUser?.id && (
                          <span className="tag tag-neutral"> tú</span>
                        )}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="tag">{roleLabels[user.role]}</span>
                      </td>
                      <td>
                        <StatusBadge
                          status={user.is_active ? 'APPROVED' : 'CANCELLED'}
                          label={user.is_active ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td>{formatDateTime(user.created_at)}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(user)}
                        >
                          Editar
                        </button>
                        {user.is_active && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeactivateTarget(user)}
                          >
                            Desactivar
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
        open={modalOpen}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
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
              form="user-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <form id="user-form" className="form-grid" onSubmit={submit}>
          <label className="field field-span-2">
            <span>Email *</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              disabled={Boolean(editing)}
              required
            />
          </label>
          <label className="field field-span-2">
            <span>Nombre *</span>
            <input
              value={form.name}
              maxLength={100}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Rol</span>
            <select
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value as UserRole })
              }
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {roleLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</span>
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required={!editing}
              autoComplete="new-password"
            />
          </label>
          {editing && (
            <label className="checkbox-field field-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
                disabled={editing.id === currentUser?.id}
              />
              <span>Cuenta activa</span>
            </label>
          )}
          {formError && <div className="form-error field-span-2">{formError}</div>}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Desactivar usuario"
        message={`¿Confirma desactivar la cuenta de ${deactivateTarget?.name}? No podrá iniciar sesión hasta reactivarla.`}
        confirmLabel="Desactivar"
        danger
        busy={deactivating}
        onConfirm={() => void confirmDeactivate()}
        onClose={() => setDeactivateTarget(null)}
      />
    </>
  );
}
