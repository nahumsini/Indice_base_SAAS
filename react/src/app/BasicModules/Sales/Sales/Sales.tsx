import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { FailureToast } from '../../../components/FailureToast';
import { useLanguage } from '../../../shared/context';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { CommissionManagementModal } from './components/CommissionManagementModal';
import { SaleSummaryPreviewModal } from './components/SaleSummaryPreviewModal';
import { SalesColumnsModal } from './components/SalesColumnsModal';
import { SalesDetailModal } from './components/SalesDetailModal';
import { SalesHeader } from './components/SalesHeader';
import { SalesView } from './components/SalesView';
import { useSalesRecords } from './hooks/useSalesRecords';
import { useSalesTranslations } from './hooks/useSalesTranslations';
import type { CommissionRule } from './types/commissions';
import type { SaleRecord } from './types/salesTypes';
import { calculateCommissionRecords } from './utils/commissionRules';
import { commissionRulesService } from './services/commissionRulesService';
import { useSalesCrm } from '../salesCrmContext';
import { inventoryApi } from '../Inventory/services/inventoryApi';
import type { InventoryWarehouse } from '../Inventory/types/inventoryTypes';
import { salesApi } from '../salesApi';
import type { SalesCurrentSeller } from './types/salesTypes';
import { isSalesWarehouseReady } from './utils/salesWarehouseScope';
import { receivablesApi } from '../../Receivables/services/receivablesApi';
import type { ReceivableAccount, ReceivablePayment } from '../../Receivables/types';
import { downloadQuotePdf } from '../Cotizacion/quotePdf';
import { useQuotesTranslations } from '../Cotizacion/translations';
import { buildSaleReceivableSummary } from './utils/salesOperationalSignals';
import type { SaleReceivableSummary, SaleSourceSummary } from './types/salesTypes';
import { downloadSaleNotePdf } from './utils/saleInvoicePdf';
import { getSalesOperationalContext } from './data/salesOperationalContext';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';

function SaleCancelDialog({
  record,
  t,
  onCancel,
  onConfirm,
}: {
  record: SaleRecord | null;
  t: ReturnType<typeof useSalesTranslations>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDeleteDialog
      isVisible={Boolean(record)}
      title={t.table.actions.cancelSale}
      description={t.table.actions.cancelConfirmation}
      itemName={record ? `${record.saleNumber} · ${record.customerName}` : undefined}
      cancelLabel={t.common.cancel}
      confirmLabel={t.table.actions.cancelSale}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function SaleDeleteDialog({ record, t, onCancel, onConfirm }: {
  record: SaleRecord | null;
  t: ReturnType<typeof useSalesTranslations>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDeleteDialog
      isVisible={Boolean(record)}
      title={t.table.actions.deleteSale}
      description={t.table.actions.deleteConfirmation}
      itemName={record ? `${record.saleNumber} · ${record.customerName}` : undefined}
      cancelLabel={t.common.cancel}
      confirmLabel={t.table.actions.deleteSale}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

interface SalesProps {
  learningModeActive?: boolean;
}

export default function Sales({ learningModeActive = false }: SalesProps) {
  const t = useSalesTranslations();
  const { currentLanguage } = useLanguage();
  const quotesCopy = useQuotesTranslations();
  const navigate = useNavigate();
  const { identity: companyPrintIdentity } = useCompanyPrintIdentity();
  const {
    quotes,
    products,
    contacts,
    opportunities,
    createContactRecord,
    updateQuoteStatus,
    updateOpportunity,
  } = useSalesCrm();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const {
    records,
    filteredRecords,
    metrics,
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    lifecycleByRecordId,
    sellers,
    customers,
    createSaleRecord,
    updateSaleRecord,
    deleteSaleRecord,
    creationWarning,
    clearCreationWarning,
  } = useSalesRecords(preferredCurrency);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [commissionRulesError, setCommissionRulesError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SaleRecord | null>(null);
  const [summaryPreviewRecord, setSummaryPreviewRecord] = useState<SaleRecord | null>(null);
  const [commissionRecord, setCommissionRecord] = useState<SaleRecord | null>(null);
  const [pendingCancelRecord, setPendingCancelRecord] = useState<SaleRecord | null>(null);
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState<SaleRecord | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [warehouses, setWarehouses] = useState<InventoryWarehouse[]>([]);
  const [currentSeller, setCurrentSeller] = useState<SalesCurrentSeller>();
  const [receivableAccounts, setReceivableAccounts] = useState<ReceivableAccount[]>([]);
  const [receivablePayments, setReceivablePayments] = useState<ReceivablePayment[]>([]);
  const commissionRecords = useMemo(() => calculateCommissionRecords(records, commissionRules), [commissionRules, records]);

  useEffect(() => {
    let cancelled = false;
    void commissionRulesService.list()
      .then((loadedRules) => {
        if (!cancelled) setCommissionRules(loadedRules);
      })
      .catch(() => setCommissionRulesError('No se pudieron cargar las reglas de comisión desde el backend.'));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void receivablesApi.workspace()
      .then((workspace) => {
        if (cancelled) return;
        setReceivableAccounts(workspace.receivables);
        setReceivablePayments(workspace.payments);
      })
      .catch(() => {
        if (cancelled) return;
        setReceivableAccounts([]);
        setReceivablePayments([]);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([inventoryApi.loadWarehouses(), salesApi.context()])
      .then(([warehousesResult, contextResult]) => {
        if (cancelled) return;
        setWarehouses(
          warehousesResult.status === 'fulfilled'
            ? warehousesResult.value.filter(isSalesWarehouseReady)
            : [],
        );
        if (contextResult.status !== 'fulfilled') return;
        const currentUser = contextResult.value.users.find(
          (user) => user.userCompanyId === contextResult.value.currentUserCompanyId,
        );
        if (currentUser) {
          setCurrentSeller({
            sellerId: String(currentUser.userId ?? currentUser.userCompanyId),
            sellerUserCompanyId: currentUser.userCompanyId,
            sellerName: currentUser.name || currentUser.email,
          });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const handleCreateSale = () => {
    setSelectedRecord(null);
    setIsDetailModalOpen(true);
  };

  const handleViewRecord = (record: SaleRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const getQuoteForSale = (record: SaleRecord) => (
    quotes.find((quote) => quote.id === record.quoteId)
    ?? quotes.find((quote) => quote.quoteNumber === record.quoteReference)
    ?? null
  );

  const receivablesByRecordId = useMemo<Record<string, SaleReceivableSummary | undefined>>(
    () => Object.fromEntries(records.map((record) => [
      record.id,
      buildSaleReceivableSummary(record, receivableAccounts),
    ])),
    [receivableAccounts, records],
  );

  const sourceByRecordId = useMemo<Record<string, SaleSourceSummary>>(
    () => Object.fromEntries(records.map((record) => {
      const quote = quotes.find((item) => item.id === record.quoteId)
        ?? quotes.find((item) => item.quoteNumber === record.quoteReference)
        ?? null;
      const opportunityId = record.prospectId || quote?.opportunityId;
      const opportunity = opportunityId
        ? opportunities.find((item) => item.id === opportunityId) ?? null
        : null;

      return [record.id, {
        opportunityName: opportunity?.opportunityName ?? '',
        quoteReference: quote?.quoteNumber ?? '',
        hasQuoteDocument: Boolean(quote),
      }];
    })),
    [opportunities, quotes, records],
  );

  const handlePreviewSummary = (record: SaleRecord) => {
    setSummaryPreviewRecord(record);
    setIsSummaryPreviewOpen(true);
  };

  const handleDownloadQuote = (record: SaleRecord) => {
    const quote = getQuoteForSale(record);
    if (!quote) return;

    const contact = quote.clientId
      ? contacts.find((item) => item.id === quote.clientId) ?? null
      : contacts.find((item) => (
          item.company.trim().toLocaleLowerCase() === quote.clientName.trim().toLocaleLowerCase()
          && item.contactPerson.trim().toLocaleLowerCase() === quote.contactPerson.trim().toLocaleLowerCase()
        )) ?? null;
    const opportunity = quote.opportunityId
      ? opportunities.find((item) => item.id === quote.opportunityId) ?? null
      : null;

    downloadQuotePdf({ quote, contact, opportunity, copy: quotesCopy });
  };

  const handleDownloadInvoice = (record: SaleRecord) => {
    downloadSaleNotePdf({
      sale: record,
      quote: getQuoteForSale(record),
      operationalContext: getSalesOperationalContext(record.businessId),
      company: companyPrintIdentity,
      copy: t,
      locale: typeof navigator === 'undefined' ? 'es-MX' : navigator.language || 'es-MX',
    });
  };

  const handleManageCommission = (record: SaleRecord) => {
    setCommissionRecord(record);
    setIsCommissionModalOpen(true);
  };

  const handlePrepareMovement = (record: SaleRecord) => {
    updateSaleRecord(record.id, {
      inventoryMovementStatus: 'pending',
      inventoryStatus: record.inventoryStatus === 'pending' ? 'reserved' : record.inventoryStatus,
    });
  };

  const handleSendToFinance = (record: SaleRecord) => {
    updateSaleRecord(record.id, {
      financeStatus: 'pending',
      paymentEvidenceStatus: record.paymentEvidenceStatus === 'missing' ? 'under_review' : record.paymentEvidenceStatus,
    });
  };

  const handleSendToCredit = (record: SaleRecord) => {
    updateSaleRecord(record.id, {
      commercialStatus: record.commercialStatus === 'pending_validation' ? 'approved' : record.commercialStatus,
      financeStatus: 'pending',
      paymentMethod: 'credit',
    });
    const candidateSaleId = record.backendId ? `sales:${record.backendId}` : record.id;
    navigate(`/receivables/credit-sales?candidateSaleId=${encodeURIComponent(candidateSaleId)}&openCreditSale=1`);
  };

  const handleOpenReceivables = (record: SaleRecord) => {
    if (receivablesByRecordId[record.id]) {
      navigate('/receivables/accounts-receivable');
      return;
    }

    handleSendToCredit(record);
  };

  const handleCancelSale = (record: SaleRecord) => {
    setPendingCancelRecord(record);
  };

  const handleConfirmCancelSale = () => {
    if (!pendingCancelRecord) {
      return;
    }

    updateSaleRecord(pendingCancelRecord.id, {
      commercialStatus: 'cancelled',
    });
    setPendingCancelRecord(null);
  };

  const handleConfirmDeleteSale = async () => {
    if (!pendingDeleteRecord) return;
    const record = pendingDeleteRecord;
    setDeleteError('');
    try {
      await deleteSaleRecord(record.id);
      setPendingDeleteRecord(null);
    } catch (error) {
      setDeleteError(error instanceof Error && error.message ? error.message : t.table.actions.deleteError);
    }
  };

  return (
    <section className="space-y-5">
      <SalesHeader
        t={t}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onOpenCommissionRules={() => navigate('/sales/commissions')}
        onCreateSale={handleCreateSale}
      />

      <SalesView
          learningModeActive={learningModeActive}
          records={records}
          filteredRecords={filteredRecords}
          metrics={metrics}
          filters={filters}
          visibleColumns={visibleColumns}
          lifecycleByRecordId={lifecycleByRecordId}
          receivablesByRecordId={receivablesByRecordId}
          sourceByRecordId={sourceByRecordId}
          receivableAccounts={receivableAccounts}
          receivablePayments={receivablePayments}
          sellers={sellers}
          customers={customers}
          t={t}
          onFiltersChange={setFilters}
          onViewRecord={handleViewRecord}
          onPreviewSummary={handlePreviewSummary}
          onManageCommission={handleManageCommission}
          onPrepareMovement={handlePrepareMovement}
          onSendToFinance={handleSendToFinance}
          onSendToCredit={handleSendToCredit}
          onOpenReceivables={handleOpenReceivables}
          onDownloadQuote={handleDownloadQuote}
          onDownloadInvoice={handleDownloadInvoice}
          onCancelSale={handleCancelSale}
          onDeleteSale={setPendingDeleteRecord}
      />

      <SalesColumnsModal
        open={isColumnsModalOpen}
        visibleColumns={visibleColumns}
        t={t}
        onOpenChange={setIsColumnsModalOpen}
        onVisibleColumnsChange={setVisibleColumns}
      />

      <SalesDetailModal
        open={isDetailModalOpen}
        record={selectedRecord}
        quotes={quotes}
        products={products}
        warehouses={warehouses}
        currentSeller={currentSeller}
        contacts={contacts}
        opportunities={opportunities}
        lifecycle={selectedRecord ? lifecycleByRecordId[selectedRecord.id] : undefined}
        commissionRecords={selectedRecord ? commissionRecords.filter((commission) => commission.saleId === selectedRecord.id) : []}
        company={companyPrintIdentity}
        locale={currentLanguage.code}
        t={t}
        onOpenChange={setIsDetailModalOpen}
        onCreateCustomer={createContactRecord}
        onCreate={(draft) => createSaleRecord({
          ...draft,
          saleLines: draft.saleLines.map((line) => {
            const product = products.find((item) => item.id === line.productId || String(item.backendId ?? '') === line.productId);
            return product ? { ...line, categoryId: product.category.toLowerCase().replace(/\s+/g, '-'), categoryName: product.category } : line;
          }),
        })}
        onUpdate={updateSaleRecord}
        onCreditSaleCreated={handleSendToCredit}
        onQuoteConverted={(quoteId, opportunityId) => {
          const convertedQuote = quotes.find((quote) => quote.id === quoteId);
          updateQuoteStatus(quoteId, 'Closed Won');
          if (opportunityId) {
            updateOpportunity(opportunityId, {
              stage: 'Won',
              status: 'Closed',
              probability: '100%',
              ...(convertedQuote ? {
                estimatedValue: String(convertedQuote.total),
                currency: convertedQuote.currency,
                lastContact: convertedQuote.lastUpdated || convertedQuote.createdDate,
              } : {}),
            });
          }
        }}
      />

      <SaleSummaryPreviewModal
        open={isSummaryPreviewOpen}
        sale={summaryPreviewRecord}
        quote={summaryPreviewRecord ? getQuoteForSale(summaryPreviewRecord) : null}
        company={companyPrintIdentity}
        locale={currentLanguage.code}
        t={t}
        onOpenChange={setIsSummaryPreviewOpen}
      />

      <CommissionManagementModal
        open={isCommissionModalOpen}
        record={commissionRecord}
        t={t}
        onOpenChange={setIsCommissionModalOpen}
        onUpdate={updateSaleRecord}
      />

      <SaleCancelDialog
        record={pendingCancelRecord}
        t={t}
        onCancel={() => setPendingCancelRecord(null)}
        onConfirm={handleConfirmCancelSale}
      />

      <SaleDeleteDialog
        record={pendingDeleteRecord}
        t={t}
        onCancel={() => setPendingDeleteRecord(null)}
        onConfirm={() => void handleConfirmDeleteSale()}
      />

      <FailureToast
        isVisible={creationWarning === 'paymentEvidenceUploadFailed'}
        message={t.modal.wizard.paymentEvidenceUploadWarning}
        onClose={clearCreationWarning}
      />
      <FailureToast
        isVisible={Boolean(commissionRulesError)}
        message={commissionRulesError}
        onClose={() => setCommissionRulesError('')}
      />
      <FailureToast
        isVisible={Boolean(deleteError)}
        message={deleteError}
        onClose={() => setDeleteError('')}
      />
    </section>
  );
}
