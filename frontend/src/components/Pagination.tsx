export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <div className="pagination">
        <span className="pagination-summary">{total} registro(s)</span>
      </div>
    );
  }

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ← Anterior
      </button>
      <span className="pagination-summary">
        Página {page} de {totalPages} · {total} registro(s)
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente →
      </button>
    </div>
  );
}
