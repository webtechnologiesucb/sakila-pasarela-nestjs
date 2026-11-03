import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { auditService } from '../services/audit';
import type { AuditLog, Paginated } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { formatDateTime } from '../utils/format';

export function AuditPage() {
  const toast = useToast();

  const [result, setResult] = useState<Paginated<AuditLog> | null>(null);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await auditService.list({
          page,
          limit: 15,
          entityType: entityType.trim() || undefined,
          action: action.trim() || undefined,
          from: from ? `${from}T00:00:00.000Z` : undefined,
          to: to ? `${to}T23:59:59.999Z` : undefined,
        }),
      );
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, from, to, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Auditoría"
        subtitle="Trazabilidad de operaciones que modifican datos."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            ↻ Actualizar
          </button>
        }
      />

      <div className="filters-bar filters-wrap">
        <label className="field field-inline">
          <span>Entidad</span>
          <input
            placeholder="payments, users…"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field field-inline">
          <span>Acción</span>
          <input
            placeholder="POST /api/…"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field field-inline">
          <span>Desde</span>
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field field-inline">
          <span>Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <span className="muted small">
          {result ? `${result.meta.total} registro(s)` : '—'}
        </span>
      </div>

      <div className="panel">
        {loading ? (
          <Loading />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            title="Sin registros de auditoría"
            description="Las acciones de creación, edición y pago aparecerán aquí."
          />
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>ID entidad</th>
                    <th>IP</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.created_at)}</td>
                      <td>
                        {log.user ? (
                          <>
                            <strong>{log.user.name}</strong>
                            <div className="muted small">{log.user.email}</div>
                          </>
                        ) : (
                          <span className="muted">Sistema / anónimo</span>
                        )}
                      </td>
                      <td className="mono">{log.action}</td>
                      <td>{log.entity_type}</td>
                      <td className="mono">{log.entity_id || '—'}</td>
                      <td className="mono">{log.ip_address || '—'}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelected(log)}
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
        open={Boolean(selected)}
        title="Detalle de auditoría"
        onClose={() => setSelected(null)}
        wide
      >
        {selected && (
          <div className="detail-stack">
            <div className="detail-grid">
              <div>
                <span className="detail-label">Acción</span>
                <strong className="mono">{selected.action}</strong>
              </div>
              <div>
                <span className="detail-label">Entidad</span>
                <strong>{selected.entity_type}</strong>
              </div>
              <div>
                <span className="detail-label">ID entidad</span>
                <strong className="mono">{selected.entity_id || '—'}</strong>
              </div>
              <div>
                <span className="detail-label">Fecha</span>
                <strong>{formatDateTime(selected.created_at)}</strong>
              </div>
              <div>
                <span className="detail-label">Usuario</span>
                <strong>{selected.user?.email || '—'}</strong>
              </div>
              <div>
                <span className="detail-label">IP</span>
                <strong className="mono">{selected.ip_address || '—'}</strong>
              </div>
            </div>

            <div>
              <span className="detail-label">Valores nuevos</span>
              <pre className="json-block">
                {JSON.stringify(selected.new_values, null, 2) || '—'}
              </pre>
            </div>

            {selected.old_values && (
              <div>
                <span className="detail-label">Valores anteriores</span>
                <pre className="json-block">
                  {JSON.stringify(selected.old_values, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <span className="detail-label">User agent</span>
              <p className="muted small">{selected.user_agent || '—'}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
