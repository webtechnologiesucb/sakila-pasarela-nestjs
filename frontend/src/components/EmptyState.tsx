export function EmptyState({
  title = 'Sin resultados',
  description = 'No hay información para mostrar con los filtros actuales.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">∅</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
