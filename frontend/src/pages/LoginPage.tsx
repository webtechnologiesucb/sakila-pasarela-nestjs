import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useToast } from '../store/toast';
import { getApiError } from '../api/client';

const demoAccounts = [
  { label: 'Administrador', email: 'admin@sakila-gateway.demo', password: 'Admin@12345!' },
  { label: 'Operador', email: 'staff@sakila-gateway.demo', password: 'Staff@12345!' },
  { label: 'Consulta', email: 'viewer@sakila-gateway.demo', password: 'Viewer@12345!' },
];

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('admin@sakila-gateway.demo');
  const [password, setPassword] = useState('Admin@12345!');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(email.trim(), password);
      toast.success('Sesión iniciada correctamente');
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const useDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <div className="brand-mark brand-mark-lg">S</div>
          <div>
            <strong>Sakila Pay</strong>
            <span>Pasarela de pagos simulada</span>
          </div>
        </div>

        <h1>Pagos, órdenes y reembolsos sobre el catálogo Sakila.</h1>
        <p>
          Proyecto demostrativo full-stack con NestJS, Prisma, PostgreSQL y React.
          Todas las transacciones son ficticias y deterministas.
        </p>

        <ul className="login-features">
          <li>Autenticación JWT con refresh tokens y roles</li>
          <li>Pagos idempotentes con simulador determinista</li>
          <li>Reembolsos parciales y totales auditados</li>
          <li>Reportes agregados y trazabilidad completa</li>
        </ul>

        <div className="login-warning">
          ⚠️ Entorno de demostración: no se procesa dinero real ni se almacenan
          datos de tarjetas.
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2>Iniciar sesión</h2>
          <p className="muted">Acceda con una cuenta de demostración.</p>

          <form onSubmit={submit} className="form-stack">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Validando…' : 'Entrar'}
            </button>
          </form>

          <div className="demo-accounts">
            <span className="muted">Cuentas demo</span>
            <div className="demo-account-grid">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="demo-account"
                  onClick={() => useDemo(account)}
                >
                  <strong>{account.label}</strong>
                  <span>{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
