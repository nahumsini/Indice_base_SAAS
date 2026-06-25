import { ArrowLeft, ExternalLink, Route } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { CompanyRoute } from '../auth/authTypes';
import indiceLogoUrl from '../assets/indice-logo.png';

type RouteState = {
  route?: CompanyRoute;
  email?: string;
};

export function CompanyRoutePage() {
  const { state } = useLocation();
  const route = (state as RouteState | null)?.route;
  const email = (state as RouteState | null)?.email;

  return (
    <main className="route-page">
      <section className="route-card">
        <img src={indiceLogoUrl} alt="Indice" />
        <div className="route-icon">
          <Route aria-hidden />
        </div>
        <p className="route-eyebrow">Company routing</p>
        <h1>{route ? route.companyName : 'Company route not selected'}</h1>
        <p>
          {route
            ? `${email || 'This user'} belongs to a ${route.environment} company.`
            : 'Return to login and enter a company name to test routing.'}
        </p>
        {route ? (
          <a className="route-link" href={route.appUrl}>
            Continue to {route.appUrl}
            <ExternalLink aria-hidden />
          </a>
        ) : null}
        <Link className="back-link" to="/login">
          <ArrowLeft aria-hidden />
          Back to login
        </Link>
      </section>
    </main>
  );
}
