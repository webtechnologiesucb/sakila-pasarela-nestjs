import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { roleLabels } from '../utils/format';

const navigation = [
  { to: '/', label: 'Dashboard', icon: '◫', end: true },
  { to: '/customers', label: 'Clientes', icon: '👤' },
  { to: '/films', label: 'Películas', icon: '🎬' },
  { to: '/orders', label: 'Órdenes', icon: '🧾' },
  { to: '/payments', label: 'Pagos', icon: '💳' },
  { to: '/refunds', label: 'Reembolsos', icon: '↩' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
  { to: '/users', label: 'Usuarios', icon: '⚙', adminOnly: true },
  { to: '/audit', label: 'Auditoría', icon: '🛡', adminOnly: true },
];

export function Layout() {
  const { user, role, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Sakila Pay</strong>
            <span>Demo Gateway</span>
          </div>
        </div>

        <div className="demo-pill">⚠ Entorno de demostración</div>

        <nav className="sidebar-nav">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>No se procesa dinero real.</p>
          <small>v1.0.0 · PostgreSQL · NestJS</small>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div className="topbar-context">
            <span className="topbar-badge">API REST · JWT</span>
          </div>

          <div className="topbar-user">
            <div className="avatar" aria-hidden="true">
              {user?.name?.slice(0, 1).toUpperCase() || '?'}
            </div>
            <div className="topbar-user-info">
              <strong>{user?.name || 'Usuario'}</strong>
              <span>{role ? roleLabels[role] : '—'}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
