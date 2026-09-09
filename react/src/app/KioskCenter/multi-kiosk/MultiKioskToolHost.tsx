import { ShieldCheck } from 'lucide-react';
import type { MultiKioskChildWorkspace } from '../../api/multiKiosks';
import { EmployeeTaskMultiKioskWorkspace } from '../../BasicModules/ProcessesTasks/Kiosk/EmployeeTaskMultiKioskWorkspace';
import { LegacyTaskMultiKioskWorkspace } from '../../BasicModules/ProcessesTasks/Kiosk/LegacyTaskMultiKioskWorkspace';
import { AttendanceMultiKioskWorkspace } from '../AttendanceMultiKioskWorkspace';
import { PettyCashMultiKioskWorkspace } from '../PettyCashMultiKioskWorkspace';
import { PayablesMultiKioskWorkspace } from '../PayablesMultiKioskWorkspace';
import { PointOfSaleMultiKioskWorkspace } from '../PointOfSaleMultiKioskWorkspace';
import type { MultiKioskMobileCopy } from '../multiKioskMobileTranslations';
import { getMultiKioskToolPresentation } from './toolPresentation';
import { ProviderCenterMultiKioskWorkspace } from './ProviderCenterMultiKioskWorkspace';

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
export function MultiKioskToolHost({
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
      <AttendanceMultiKioskWorkspace
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
