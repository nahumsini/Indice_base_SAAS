import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="route-page">
      <section className="route-card">
        <p className="route-eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The demo shell only exposes login, register, company routing, and the protected Home Panel.</p>
        <Link className="back-link" to="/login">
          <ArrowLeft aria-hidden />
          Back to login
        </Link>
      </section>
    </main>
  );
}
