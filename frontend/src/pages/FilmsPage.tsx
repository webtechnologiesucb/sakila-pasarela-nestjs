import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { filmsService } from '../services/films';
import type { Category, Film, Paginated } from '../types';
import { getApiError } from '../api/client';
import { useToast } from '../store/toast';
import { formatMoney } from '../utils/format';

export function FilmsPage() {
  const toast = useToast();
  const [result, setResult] = useState<Paginated<Film> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Film | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    filmsService
      .categories()
      .then(setCategories)
      .catch((error) => toast.error(getApiError(error)));
  }, [toast]);

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
        await filmsService.list({
          page,
          limit: 12,
          search: debouncedSearch || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
        }),
      );
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (film: Film) => {
    setSelected(film);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setSelected(await filmsService.get(film.film_id));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Catálogo de películas"
        subtitle="Películas Sakila y categorías asociadas."
      />

      <div className="filters-bar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Buscar por título o descripción…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          className="select"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name} ({category._count?.film_categories ?? 0})
            </option>
          ))}
        </select>
        <span className="muted small">
          {result ? `${result.meta.total} película(s)` : '—'}
        </span>
      </div>

      {loading ? (
        <Loading />
      ) : !result || result.data.length === 0 ? (
        <EmptyState title="Sin películas" description="Pruebe otra búsqueda o categoría." />
      ) : (
        <>
          <div className="film-grid">
            {result.data.map((film) => (
              <article className="film-card" key={film.film_id}>
                <div className="film-card-top">
                  <span className="rating-pill">{film.rating.replace('_', '-')}</span>
                  <span className="muted small">#{film.film_id}</span>
                </div>
                <h3>{film.title}</h3>
                <p className="film-description">
                  {film.description || 'Sin descripción disponible.'}
                </p>
                <div className="film-meta">
                  <span>{film.release_year || '—'}</span>
                  <span>{film.length ? `${film.length} min` : '—'}</span>
                  <span>{formatMoney(film.rental_rate)}</span>
                </div>
                <div className="film-tags">
                  {(film.film_categories || []).slice(0, 2).map(({ category }) => (
                    <span className="tag" key={category.category_id}>
                      {category.name}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-block"
                  onClick={() => void openDetail(film)}
                >
                  Ver detalle
                </button>
              </article>
            ))}
          </div>

          <Pagination
            page={result.meta.page}
            totalPages={result.meta.totalPages}
            total={result.meta.total}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal
        open={detailOpen}
        title={selected?.title || 'Detalle de película'}
        onClose={() => setDetailOpen(false)}
        wide
      >
        {detailLoading || !selected ? (
          <Loading label="Cargando detalle…" />
        ) : (
          <div className="detail-stack">
            <p>{selected.description || 'Sin descripción disponible.'}</p>

            <div className="detail-grid">
              <div>
                <span className="detail-label">Año</span>
                <strong>{selected.release_year || '—'}</strong>
              </div>
              <div>
                <span className="detail-label">Duración</span>
                <strong>{selected.length ? `${selected.length} min` : '—'}</strong>
              </div>
              <div>
                <span className="detail-label">Tarifa</span>
                <strong>{formatMoney(selected.rental_rate)}</strong>
              </div>
              <div>
                <span className="detail-label">Idioma</span>
                <strong>{selected.language?.name || '—'}</strong>
              </div>
              <div>
                <span className="detail-label">Inventario</span>
                <strong>{selected._count?.inventories ?? 0}</strong>
              </div>
              <div>
                <span className="detail-label">Clasificación</span>
                <strong>{selected.rating.replace('_', '-')}</strong>
              </div>
            </div>

            <div>
              <span className="detail-label">Categorías</span>
              <div className="film-tags">
                {(selected.film_categories || []).map(({ category }) => (
                  <span className="tag" key={category.category_id}>
                    {category.name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="detail-label">Actores</span>
              <div className="film-tags">
                {(selected.film_actors || []).length === 0 && (
                  <span className="muted">Sin actores registrados.</span>
                )}
                {(selected.film_actors || []).map(({ actor }) => (
                  <span className="tag tag-neutral" key={actor.actor_id}>
                    {actor.first_name} {actor.last_name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
