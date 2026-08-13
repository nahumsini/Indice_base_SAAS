import { useEffect, useState } from 'react';
import ConsultingAdminTab from '../PlatformAdmin/ConsultingAdminTab';
import type { ConsultingCompanyOption } from '../PlatformAdmin/ConsultingSessions';
import { distributorPortalApi } from './contracts-access/services/distributorPortalApi';
import type { DistributorPortalContext } from './contracts-access/types/contractsAccess';

export function DistributorConsultingPage() {
  const [companies, setCompanies] = useState<ConsultingCompanyOption[]>([]);
  const [context, setContext] = useState<DistributorPortalContext | null>(null);
  const [portfolioError, setPortfolioError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([
      distributorPortalApi.getContext(),
      distributorPortalApi.getPortfolio('', 'ALL'),
    ])
      .then(([portalContext, portfolio]) => {
        if (!active) return;
        setContext(portalContext);
        setCompanies(portfolio.clients.map((company) => ({
          id: company.company_id,
          name: company.company_name,
          owner_email: company.owner_email,
          country_code: company.country_code,
        })));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPortfolioError(error instanceof Error ? error.message : 'No se pudo cargar tu cartera.');
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-4">
      {portfolioError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {portfolioError}
        </div>
      ) : null}
      <ConsultingAdminTab
        canManage
        companies={companies}
        operations={distributorPortalApi}
        attendingConsultant={{
          name: context?.operator_name || context?.company_name || 'Distribuidor autenticado',
        }}
        capabilities={{
          viewConsultants: false,
          manageConsultants: false,
          viewCoverage: false,
          manageCoverage: false,
          createSessions: true,
          manageAppointments: true,
          managePayments: false,
        }}
        heading={{
          title: 'Consultorías de mi cartera',
          description: 'Agenda sesiones para tus clientes y administra su confirmación con el mismo flujo operativo de Índice.',
        }}
      />
    </div>
  );
}
