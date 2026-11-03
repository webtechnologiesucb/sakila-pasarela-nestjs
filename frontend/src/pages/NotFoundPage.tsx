import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <span className="not-found-code">404</span>
      <h1>Página no encontrada</h1>
      <p className="muted">
        La ruta solicitada no existe en la aplicación de demostración.
      </p>
      <Link to="/" className="btn btn-primary">
        Volver al dashboard
      </Link>
    </div>
  );
}
