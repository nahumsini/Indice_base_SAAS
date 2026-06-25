import { Home, LogOut, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import indiceLogoUrl from '../assets/indice-logo.png';

export function AppShell() {
  const { session, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Demo navigation">
        <div className="side-brand">
          <img src={indiceLogoUrl} alt="Indice" />
          <span>Demo</span>
        </div>
        <nav>
          <NavLink to="/home">
            <Home aria-hidden />
            Home Panel
          </NavLink>
        </nav>
        <div className="security-note">
          <ShieldCheck aria-hidden />
          <span>Protected workspace</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="workspace-label">Company</span>
            <strong>{session?.companyName}</strong>
          </div>
          <div className="topbar-actions">
            <span>{session?.email}</span>
            <button type="button" onClick={logout} aria-label="Sign out">
              <LogOut aria-hidden />
              Sign out
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
