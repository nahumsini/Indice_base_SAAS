import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { FailureToast } from '../../components/FailureToast';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { ApiClientError } from '../../lib/apiClient';
import { SalesCrmProvider } from '../Sales/salesCrmContext';
import { ReceivablesModuleHeader } from './components/ReceivablesModuleHeader';
import {
  legacyReceivablesTabAliases,
  receivablesTabIds,
  type ReceivablesTabId,
} from './constants/receivables.constants';
import { initialReceivablesState } from './data';
import { useCandidateCustomers } from './hooks/useCandidateCustomers';
import { useCandidateSales } from './hooks/useCandidateSales';
import { useReceivablesTranslations } from './hooks/useReceivablesTranslations';
import { receivablesApi, type ReceivablesWorkspace as ReceivablesWorkspacePayload } from './services/receivablesApi';
import type {
  CandidateSale,
  CreditPolicy,
  CreditSale,
  CreditSimulation,
  ReceivablePayment,
  ReceivablesState,
} from './types';
import {
  applyPaymentToAccounts,
  applyPaymentToInstallments,
  createInstallmentsFromCreditSale,
  createReceivableFromCreditSale,
  resolveInstallmentStatus,
  resolveReceivableStatus,
} from './utils';
import { AccountsReceivableView } from './views/AccountsReceivableView';
import { CreditCustomersView } from './views/CreditCustomersView';
import { CreditSalesView } from './views/CreditSalesView';
import { PaymentsView } from './views/PaymentsView';
import {
  LearningModeHeaderActionsProvider,
  learningModeGuideThemes,
  SimpleModuleLearningGuide,
} from '../../learningMode';
import {
  receivablesLearningControls,
  receivablesLearningLabels,
} from './operationalGuidance/receivablesLearningControls';

const shouldUseLocalFallback = (error: unknown) => !(error instanceof ApiClientError);

const receivablesErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

const hasPaymentReceipt = (payment: Omit<ReceivablePayment, 'id'>) => (
  Boolean(payment.receiptFileName || payment.receiptDataUrl || payment.receiptImageDataUrl)
);

const mergePaymentReceiptIntoWorkspace = (
  workspace: ReceivablesWorkspacePayload,
  payment: Omit<ReceivablePayment, 'id'>,
) => {
  if (!hasPaymentReceipt(payment)) {
    return workspace;
  }

  let receiptMerged = false;
  const payments = workspace.payments.map((workspacePayment) => {
    const matchesPayment = !receiptMerged
      && workspacePayment.receivableId === payment.receivableId
      && workspacePayment.paymentDate === payment.paymentDate
      && workspacePayment.method === payment.method
      && workspacePayment.reference === payment.reference
      && Math.abs(workspacePayment.amount - payment.amount) < 0.01;

    if (!matchesPayment) {
      return workspacePayment;
    }

    receiptMerged = true;
    return {
      ...workspacePayment,
      receiptDataUrl: payment.receiptDataUrl,
      receiptFileName: payment.receiptFileName,
      receiptImageDataUrl: payment.receiptImageDataUrl,
      receiptMimeType: payment.receiptMimeType,
    };
  });

  return {
    ...workspace,
    payments,
  };
};

interface ReceivablesModuleProps {
  learningModeActive?: boolean;
  onNavigate?: (page?: string) => void;
}

export default function ReceivablesModule({
  learningModeActive = false,
  onNavigate = () => undefined,
}: ReceivablesModuleProps) {
  return (
    <LearningModeHeaderActionsProvider active={learningModeActive}>
    <SalesCrmProvider>
      <ReceivablesWorkspace learningModeActive={learningModeActive} onNavigate={onNavigate} />
    </SalesCrmProvider>
    </LearningModeHeaderActionsProvider>
  );
}

function ReceivablesWorkspace({
  learningModeActive,
  onNavigate,
}: {
  learningModeActive: boolean;
  onNavigate: (page?: string) => void;
}) {
  const copy = useReceivablesTranslations();
  const mainContentRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<ReceivablesState>(initialReceivablesState);
  const [apiCandidateSales, setApiCandidateSales] = useState<CandidateSale[]>([]);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTab, isTabLoading, setActiveTab } = useRoutedModuleTab<ReceivablesTabId>(
    'credit-sales',
    receivablesTabIds,
    legacyReceivablesTabAliases,
  );
  const requestedCandidateSaleId = searchParams.get('candidateSaleId');
  const shouldOpenCreditSale = searchParams.get('openCreditSale') === '1' || Boolean(requestedCandidateSaleId);

  const applyWorkspace = useCallback((workspace: ReceivablesWorkspacePayload) => {
    setState({
      creditPolicies: workspace.creditPolicies,
      creditSales: workspace.creditSales,
      installments: workspace.installments,
      payments: workspace.payments,
      receivables: workspace.receivables,
    });
    setApiCandidateSales(workspace.candidateSales);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setIsWorkspaceLoading(true);
    try {
      const workspace = await receivablesApi.workspace();
      applyWorkspace(workspace);
      setIsBackendReady(true);
    } catch {
      setIsBackendReady(false);
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, [applyWorkspace]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const candidateSales = useCandidateSales(state.creditSales, apiCandidateSales, isBackendReady);
  const candidateCustomers = useCandidateCustomers(state.creditPolicies, candidateSales);
  const accountsWithStatus = useMemo(
    () => state.receivables.map((account) => ({
      ...account,
      status: resolveReceivableStatus(account),
    })),
    [state.receivables],
  );
  const installmentsWithStatus = useMemo(
    () => state.installments.map((installment) => ({
      ...installment,
      status: resolveInstallmentStatus(installment),
    })),
    [state.installments],
  );

  const clearCreditSaleRequest = useCallback(() => {
    if (!requestedCandidateSaleId && !searchParams.has('openCreditSale')) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('candidateSaleId');
    nextParams.delete('openCreditSale');
    setSearchParams(nextParams, { replace: true });
  }, [requestedCandidateSaleId, searchParams, setSearchParams]);

  const createCreditSale = async (draft: {
    candidate: CandidateSale;
    financedAmount: number;
    firstDueDate: string;
    creditPolicy: CreditPolicy;
    selectedSimulation: CreditSimulation;
  }) => {
    if (isBackendReady) {
      try {
        applyWorkspace(await receivablesApi.createCreditSale(draft));
        return true;
      } catch (error) {
        if (!shouldUseLocalFallback(error)) {
          setFailureToastMessage(receivablesErrorMessage(error, copy.errors.createCreditSale));
          return false;
        }
        setIsBackendReady(false);
      }
    }

    const createdSale: CreditSale = {
      id: `credit-sale-${Date.now()}`,
      saleId: draft.candidate.id,
      salesRecordId: draft.candidate.salesRecordId ?? null,
      posTicketId: draft.candidate.posTicketId ?? null,
      contactId: draft.creditPolicy.contactId ?? draft.candidate.contactId ?? null,
      unitId: draft.candidate.unitId ?? null,
      businessId: draft.candidate.businessId ?? null,
      saleNumber: draft.candidate.saleNumber,
      customerId: draft.creditPolicy.customerId,
      customerName: draft.creditPolicy.customerName,
      unit: draft.candidate.unit,
      business: draft.candidate.business,
      saleDate: draft.candidate.saleDate,
      originalAmount: draft.candidate.amount,
      financedAmount: draft.financedAmount,
      currency: draft.candidate.currency,
      status: 'active',
      selectedSimulation: draft.selectedSimulation,
      firstDueDate: draft.firstDueDate,
      source: draft.candidate.source,
    };
    const createdReceivable = createReceivableFromCreditSale(createdSale);
    const createdInstallments = createInstallmentsFromCreditSale(createdSale, createdReceivable);

    setState((current) => ({
      ...current,
      creditSales: [createdSale, ...current.creditSales],
      installments: [...createdInstallments, ...current.installments],
      receivables: [createdReceivable, ...current.receivables],
      creditPolicies: current.creditPolicies.map((policy) => (
        policy.customerId === createdSale.customerId
          ? {
              ...policy,
              availableCredit: Math.max(0, Number((policy.availableCredit - createdSale.financedAmount).toFixed(2))),
            }
          : policy
      )),
    }));
    return true;
  };

  const registerPayment = async (payment: Omit<ReceivablePayment, 'id'>) => {
    if (isBackendReady) {
      try {
        const workspace = await receivablesApi.registerPayment(payment);
        applyWorkspace(mergePaymentReceiptIntoWorkspace(workspace, payment));
        return true;
      } catch (error) {
        if (!shouldUseLocalFallback(error)) {
          setFailureToastMessage(receivablesErrorMessage(error, copy.errors.registerPayment));
          return false;
        }
        setIsBackendReady(false);
      }
    }

    const createdPayment: ReceivablePayment = {
      ...payment,
      id: `payment-${Date.now()}`,
    };

    setState((current) => {
      const nextAccounts = applyPaymentToAccounts(current.receivables, createdPayment);
      const nextInstallments = applyPaymentToInstallments(current.installments, createdPayment);
      const paidAccount = nextAccounts.find((account) => account.id === payment.receivableId);

      return {
        ...current,
        payments: [createdPayment, ...current.payments],
        installments: nextInstallments,
        receivables: nextAccounts,
        creditSales: current.creditSales.map((sale) => (
          paidAccount?.creditSaleId === sale.id && paidAccount.balance <= 0
            ? { ...sale, status: 'completed' }
            : sale
        )),
      };
    });
    return true;
  };

  const updateCreditPolicy = async (
    policyId: string,
    policy: Omit<CreditPolicy, 'id' | 'availableCredit'>,
  ) => {
    setState((current) => ({
      ...current,
      creditPolicies: current.creditPolicies.map((currentPolicy) => {
        if (currentPolicy.id !== policyId) {
          return currentPolicy;
        }

        const lineDelta = policy.creditLine - currentPolicy.creditLine;
        return {
          ...currentPolicy,
          ...policy,
          availableCredit: Math.max(0, Number((currentPolicy.availableCredit + lineDelta).toFixed(2))),
        };
      }),
    }));
    return true;
  };

  const deleteCreditPolicy = async (policyId: string) => {
    setState((current) => ({
      ...current,
      creditPolicies: current.creditPolicies.filter((policy) => policy.id !== policyId),
    }));
    return true;
  };

  const createCreditPolicy = async (policy: Omit<CreditPolicy, 'id' | 'availableCredit'>) => {
    if (isBackendReady) {
      try {
        applyWorkspace(await receivablesApi.createCreditPolicy(policy));
        return true;
      } catch (error) {
        if (!shouldUseLocalFallback(error)) {
          setFailureToastMessage(receivablesErrorMessage(error, copy.errors.createCreditPolicy));
          return false;
        }
        setIsBackendReady(false);
      }
    }

    setState((current) => ({
      ...current,
      creditPolicies: [{
        ...policy,
        id: `policy-${Date.now()}`,
        availableCredit: policy.creditLine,
      }, ...current.creditPolicies],
    }));
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-950 dark:bg-gray-900 dark:text-white">
      <LoadingBarOverlay
        isVisible={isTabLoading || isWorkspaceLoading}
        title={copy.module.loadingTitle}
        description={copy.module.loadingDescription}
      />

      <ReceivablesModuleHeader
        activeTab={activeTab}
        copy={copy}
        onNavigate={(page) => onNavigate(page)}
        onTabChange={setActiveTab}
      >
        {learningModeActive ? (
          <SimpleModuleLearningGuide
            activeContextLabel={receivablesLearningLabels[activeTab]}
            controls={receivablesLearningControls[activeTab]}
            guideId="receivables-learning-guide"
            moduleTitle="Guía para vender a crédito y cobrar con claridad"
            onPrimaryAction={() => mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            scopeId={`receivables-${activeTab}`}
            theme={learningModeGuideThemes.finance}
          />
        ) : null}
      </ReceivablesModuleHeader>

      <main ref={mainContentRef} className="mx-auto max-w-[1600px] scroll-mt-24 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        {activeTab === 'credit-sales' ? (
          <CreditSalesView
            candidateSales={candidateSales}
            copy={copy}
            creditPolicies={state.creditPolicies}
            creditSales={state.creditSales}
            requestedCandidateSaleId={shouldOpenCreditSale ? requestedCandidateSaleId : null}
            onCreditSaleRequestConsumed={clearCreditSaleRequest}
            onCreateCreditSale={createCreditSale}
          />
        ) : null}
        {activeTab === 'accounts-receivable' ? (
          <AccountsReceivableView
            accounts={accountsWithStatus.filter((account) => account.balance > 0)}
            copy={copy}
            installments={installmentsWithStatus}
            onRegisterPayment={registerPayment}
            payments={state.payments}
          />
        ) : null}
        {activeTab === 'payments' ? (
          <PaymentsView
            accounts={accountsWithStatus.filter((account) => account.balance > 0)}
            allAccounts={accountsWithStatus}
            copy={copy}
            payments={state.payments}
            onRegisterPayment={registerPayment}
          />
        ) : null}
        {activeTab === 'credit-customers' ? (
          <CreditCustomersView
            candidateCustomers={candidateCustomers}
            copy={copy}
            creditPolicies={state.creditPolicies}
            onCreatePolicy={createCreditPolicy}
            onDeletePolicy={deleteCreditPolicy}
            onUpdatePolicy={updateCreditPolicy}
          />
        ) : null}
      </main>

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
    </div>
  );
}
