import { FileKey2, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type {
  BenefitPayload,
  PlatformAdminContext,
  PlatformCompanyDetail,
} from '../../api/platformAdmin';
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
} from '../../components/frontend-os';
import AccountCreationModal from '../../PlatformAdmin/AccountCreationModal';
import CompanyAccountDrawer from '../../PlatformAdmin/CompanyAccountDrawer';
import { TrialExtensionModal, type TrialExtensionDays } from '../../PlatformAdmin/Customers/TrialExtensionModal';
import type { DistributorClient, DistributorStageFilter } from './types/contractsAccess';
import type { DistributorPortalCopy } from './translations';
import { useContractsAccess } from './hooks/useContractsAccess';
import { PortfolioMetrics } from './components/PortfolioMetrics';
import { ClientPortfolioTable } from './components/ClientPortfolioTable';
import { distributorPortalApi } from './services/distributorPortalApi';

const initialBenefit: BenefitPayload = {
  benefit_type: 'PRODUCT',
  product_code: '',
  quantity: 1,
  source_type: 'SUPPORT',
  reason: '',
  campaign_code: '',
  ends_at: '',
};

const managementContext: PlatformAdminContext = {
  role: 'distributor',
  permissions: ['portfolio:manage'],
  can_manage_benefits: true,
  can_manage_ownership: false,
  can_manage_modules: true,
  can_manage_consulting: true,
  can_manage_accounts: true,
};

export function ContractsAccessPage({ copy, locale }: { copy: DistributorPortalCopy; locale: string }) {
  const portfolio = useContractsAccess();
  const [selected, setSelected] = useState<PlatformCompanyDetail | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [openingCompanyId, setOpeningCompanyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [trialCompany, setTrialCompany] = useState<DistributorClient | null>(null);
  const [trialError, setTrialError] = useState('');
  const [benefit, setBenefit] = useState<BenefitPayload>(initialBenefit);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const stageOptions = [
    { value: 'ALL', label: copy.filters.allStages },
    ...(['PROSPECT', 'DEMO', 'TRIAL', 'ACTIVE', 'ATTENTION', 'INACTIVE'] as const).map((value) => ({ value, label: copy.states[value] })),
  ];
  const catalogProducts = useMemo(
    () => (portfolio.catalog?.products ?? []).filter((product) => product.active && product.commercially_available !== false),
    [portfolio.catalog],
  );
  const existingOwnerEmails = useMemo(
    () => (portfolio.portfolio?.clients ?? []).flatMap((client) => client.owner_email ? [client.owner_email] : []),
    [portfolio.portfolio],
  );

  const refreshCompany = async () => {
    if (!selected) return;
    const nextCompany = await distributorPortalApi.getCompany(selected.id);
    setSelected(nextCompany);
    await portfolio.refresh();
  };

  const openCompany = async (companyId: number) => {
    if (openingCompanyId !== null) return;
    setOpeningCompanyId(companyId);
    setFeedback(null);
    try {
      setSelected(await distributorPortalApi.getCompany(companyId));
    } catch (loadError) {
      setFeedback({
        type: 'error',
        message: loadError instanceof Error ? loadError.message : 'No se pudo abrir la cuenta.',
      });
    } finally {
      setOpeningCompanyId(null);
    }
  };

  const grantProductAccess = async (productCode: string) => {
    if (!selected || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const accessEndsAt = selected.benefits
        .filter((item) => item.status.toUpperCase() === 'ACTIVE' && item.ends_at)
        .map((item) => item.ends_at as string)
        .sort()[0];
      await distributorPortalApi.grantBenefit(selected.id, {
        benefit_type: 'PRODUCT',
        product_code: productCode,
        quantity: 1,
        source_type: 'SUPPORT',
        reason: 'Módulo administrado por el distribuidor responsable de la cuenta.',
        campaign_code: 'DISTRIBUTOR-ACCESS',
        ends_at: accessEndsAt,
      });
      await refreshCompany();
      setFeedback({ type: 'success', message: 'El módulo quedó habilitado para esta cuenta.' });
    } catch (saveError) {
      setFeedback({ type: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo habilitar el módulo.' });
    } finally {
      setSaving(false);
    }
  };

  const updateTrialProducts = async (productCodes: string[]) => {
    if (!selected || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await distributorPortalApi.updateTrialProducts(selected.id, productCodes);
      await refreshCompany();
      setFeedback({
        type: 'success',
        message: result.charge_timing === 'TRIAL_END'
          ? `La prueba quedó configurada con ${result.product_codes.length} módulo(s); Stripe usará esta selección al terminar.`
          : `La cuenta quedó con ${result.product_codes.length} módulo(s); el cambio se reflejará en su facturación.`,
      });
    } catch (saveError) {
      setFeedback({ type: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudieron actualizar los módulos.' });
    } finally {
      setSaving(false);
    }
  };

  const submitBenefit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await distributorPortalApi.grantBenefit(selected.id, {
        ...benefit,
        product_code: benefit.benefit_type === 'PRODUCT' ? benefit.product_code?.trim() : undefined,
        quantity: benefit.benefit_type === 'PRODUCT' ? 1 : Number(benefit.quantity || 1),
        reason: benefit.reason.trim(),
        campaign_code: benefit.campaign_code?.trim() || undefined,
        ends_at: benefit.ends_at ? new Date(benefit.ends_at).toISOString() : undefined,
      });
      setBenefit(initialBenefit);
      await refreshCompany();
      setFeedback({ type: 'success', message: 'El ajuste se aplicó y quedó registrado.' });
    } catch (saveError) {
      setFeedback({ type: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo aplicar el ajuste.' });
    } finally {
      setSaving(false);
    }
  };

  const revokeBenefit = async (reference: string, label?: string) => {
    if (!selected || saving) return;
    const confirmed = window.confirm(`¿Quitar ${label || 'este acceso'} de la cuenta?`);
    if (!confirmed) return;
    setSaving(true);
    setFeedback(null);
    try {
      await distributorPortalApi.revokeBenefit(selected.id, reference, 'Acceso retirado por el distribuidor responsable.');
      await refreshCompany();
      setFeedback({ type: 'success', message: 'El acceso fue retirado correctamente.' });
    } catch (saveError) {
      setFeedback({ type: 'error', message: saveError instanceof Error ? saveError.message : 'No se pudo retirar el acceso.' });
    } finally {
      setSaving(false);
    }
  };

  const extendTrial = async (days: TrialExtensionDays) => {
    if (!trialCompany || saving) return;
    setSaving(true);
    setTrialError('');
    try {
      await distributorPortalApi.extendCompanyTrial(trialCompany.company_id, days);
      setTrialCompany(null);
      await portfolio.refresh();
    } catch (saveError) {
      setTrialError(saveError instanceof Error ? saveError.message : 'No se pudo extender el periodo de prueba.');
    } finally {
      setSaving(false);
    }
  };

  if (portfolio.loading && !portfolio.portfolio) {
    return <div className="grid min-h-80 place-items-center"><RefreshCw className="h-8 w-8 animate-spin text-[#2563EB]" /></div>;
  }

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<FileKey2 className="h-5 w-5" />}
        eyebrow={copy.header.eyebrow}
        title={copy.header.title}
        subtitle={copy.header.subtitle}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(true)} disabled={!catalogProducts.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60">
              <Plus className="h-4 w-4" />
              {copy.actions.addClient}
            </button>
            <button type="button" onClick={() => void portfolio.refresh()} disabled={portfolio.refreshing} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-[#143675] transition hover:bg-blue-50 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${portfolio.refreshing ? 'animate-spin' : ''}`} />
              {portfolio.refreshing ? copy.actions.refreshing : copy.actions.refresh}
            </button>
          </div>
        )}
      />

      {portfolio.error || (feedback?.type === 'error' && !selected) ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <p className="font-semibold">{copy.errors.title}</p><p className="mt-1">{portfolio.error || feedback?.message}</p>
        </section>
      ) : null}

      {portfolio.portfolio ? <PortfolioMetrics copy={copy} summary={portfolio.portfolio.summary} /> : null}

      <IndiceFilterBar
        title={copy.filters.title}
        subtitle={copy.filters.subtitle}
        summary={`${portfolio.portfolio?.matching_clients ?? 0} ${copy.filters.matches}`}
        gridClassName="md:grid-cols-[minmax(0,1fr)_280px]"
      >
        <IndiceFilterSearch
          tone="blue"
          label={copy.filters.search}
          placeholder={copy.filters.searchPlaceholder}
          value={portfolio.query}
          onValueChange={portfolio.setQuery}
          onClear={() => portfolio.setQuery('')}
        />
        <IndiceFilterSelect
          tone="blue"
          label={copy.filters.stage}
          value={portfolio.stage}
          options={stageOptions}
          onValueChange={(value) => portfolio.setStage(value as DistributorStageFilter)}
        />
      </IndiceFilterBar>

      <ClientPortfolioTable
        clients={portfolio.portfolio?.clients ?? []}
        copy={copy}
        locale={locale}
        portfolioEmpty={(portfolio.portfolio?.summary.total_clients ?? 0) === 0}
        onSelect={(client) => void openCompany(client.company_id)}
        onExtendTrial={(client) => { setTrialError(''); setTrialCompany(client); }}
      />

      {createOpen ? (
        <AccountCreationModal
          products={catalogProducts}
          existingOwnerEmails={existingOwnerEmails}
          lockedAccountType="SUPER_ADMIN"
          returnTo="/distributor-portal"
          onClose={() => setCreateOpen(false)}
          onCreate={distributorPortalApi.createCompanyAccount}
          onOpenAccount={(companyId) => {
            setCreateOpen(false);
            void portfolio.refresh();
            void openCompany(companyId);
          }}
        />
      ) : null}

      {selected ? (
        <CompanyAccountDrawer
          company={selected}
          context={managementContext}
          catalogProducts={catalogProducts}
          benefit={benefit}
          saving={saving}
          feedback={feedback}
          onClose={() => { setSelected(null); setFeedback(null); }}
          onBenefit={setBenefit}
          onSubmitBenefit={submitBenefit}
          onGrantProduct={grantProductAccess}
          onUpdateTrialProducts={updateTrialProducts}
          onRefreshCompany={refreshCompany}
          onRevokeBenefit={(reference, label) => void revokeBenefit(reference, label)}
          userApi={distributorPortalApi}
        />
      ) : null}

      {trialCompany ? (
        <TrialExtensionModal
          company={{
            name: trialCompany.company_name,
            trial_ends_at: trialCompany.trial_ends_at,
            trial_days_remaining: trialCompany.trial_days_remaining,
          }}
          english={locale.startsWith('en')}
          saving={saving}
          error={trialError}
          onClose={() => { if (!saving) { setTrialCompany(null); setTrialError(''); } }}
          onConfirm={extendTrial}
        />
      ) : null}
    </div>
  );
}
