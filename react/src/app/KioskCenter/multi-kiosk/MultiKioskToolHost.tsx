import { lazy, Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { MultiKioskChildWorkspace } from '../../api/multiKiosks';
const EmployeeTaskMultiKioskWorkspace = lazy(() => import('../../BasicModules/ProcessesTasks/Kiosk/EmployeeTaskMultiKioskWorkspace').then(module => ({ default: module.EmployeeTaskMultiKioskWorkspace })));
const LegacyTaskMultiKioskWorkspace = lazy(() => import('../../BasicModules/ProcessesTasks/Kiosk/LegacyTaskMultiKioskWorkspace').then(module => ({ default: module.LegacyTaskMultiKioskWorkspace })));
const RouteSalesMultiKioskWorkspace = lazy(() => import('../../BasicModules/Sales/Kiosk/RouteSalesMultiKioskWorkspace').then(module => ({ default: module.RouteSalesMultiKioskWorkspace })));
const HumanResourcesMultiKioskWorkspace = lazy(() => import('../HumanResourcesMultiKioskWorkspace').then(module => ({ default: module.HumanResourcesMultiKioskWorkspace })));
const PettyCashMultiKioskWorkspace = lazy(() => import('../PettyCashMultiKioskWorkspace').then(module => ({ default: module.PettyCashMultiKioskWorkspace })));
const PayablesMultiKioskWorkspace = lazy(() => import('../PayablesMultiKioskWorkspace').then(module => ({ default: module.PayablesMultiKioskWorkspace })));
const PointOfSaleMultiKioskWorkspace = lazy(() => import('../PointOfSaleMultiKioskWorkspace').then(module => ({ default: module.PointOfSaleMultiKioskWorkspace })));
import type { MultiKioskMobileCopy } from '../multiKioskMobileTranslations';
import { getMultiKioskToolPresentation } from './toolPresentation';
const ProviderCenterMultiKioskWorkspace = lazy(() => import('./ProviderCenterMultiKioskWorkspace').then(module => ({ default: module.ProviderCenterMultiKioskWorkspace })));

export interface MultiKioskToolHostProps {
  copy: MultiKioskMobileCopy;
  kioskId: number;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

/**
 * Resolves a module-owned employee workspace by stable tool identity.
 * Module fallbacks are retained only for legacy Multikiosk compositions.
 */
export function MultiKioskToolHost(props: MultiKioskToolHostProps) {
  return <Suspense fallback={<p role="status" className="p-5 text-center text-sm text-slate-500">{props.copy.loading}</p>}><ResolvedToolWorkspace {...props} /></Suspense>;
}

function ResolvedToolWorkspace({
  copy,
  kioskId,
  locale,
  onAuthorizationFailure,
  onRefresh,
  token,
  workspace,
}: MultiKioskToolHostProps) {
  const presentation = getMultiKioskToolPresentation(workspace.kiosk);
  const toolKey = presentation.toolKey;
  const workspaceKind = presentation.workspaceKind;
  const ownerModule = presentation.ownerModule;

  if (toolKey.startsWith('provider.') || workspaceKind.startsWith('PROVIDER_')) {
    return (
      <ProviderCenterMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (toolKey === 'employee.my-tasks@1'
      || (!toolKey && workspaceKind === 'MY_TASKS')) {
    return (
      <EmployeeTaskMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        locale={locale}
        workspace={workspace}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (!toolKey && (workspaceKind === 'TASKS' || ownerModule === 'PROCESS_TASKS')) {
    return (
      <LegacyTaskMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        locale={locale}
        workspace={workspace}
        copy={copy}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (toolKey === 'employee.attendance@1'
      || (!toolKey && (workspaceKind === 'ATTENDANCE' || ownerModule === 'HUMAN_RESOURCES'))) {
    return (
      <HumanResourcesMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        locale={locale}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (toolKey === 'employee.route-sales@1'
      || (!toolKey && workspaceKind === 'ROUTE_SALES')) {
    return (
      <RouteSalesMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        locale={locale}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (workspaceKind === 'PETTY_CASH' || (!toolKey && ownerModule === 'PETTY_CASH')) {
    return (
      <PettyCashMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        locale={locale}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (workspaceKind === 'PAYABLES'
      || workspaceKind === 'ACCOUNTS_PAYABLE'
      || (!toolKey && ownerModule === 'EXPENSES')) {
    return (
      <PayablesMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  if (ownerModule === 'POINT_OF_SALE' || workspaceKind.startsWith('POS_')) {
    return (
      <PointOfSaleMultiKioskWorkspace
        token={token}
        kioskId={kioskId}
        workspace={workspace}
        locale={locale}
        onAuthorizationFailure={onAuthorizationFailure}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
      data-multi-kiosk-tool={toolKey || workspaceKind || ownerModule}
    >
      <ShieldCheck className="mx-auto h-7 w-7 text-blue-600 dark:text-blue-300" aria-hidden="true" />
      <p className="mt-3">{copy.workspace.connected}</p>
    </section>
  );
}
