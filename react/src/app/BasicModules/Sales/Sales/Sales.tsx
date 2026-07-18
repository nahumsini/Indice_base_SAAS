import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { CommissionManagementModal } from './components/CommissionManagementModal';
import { CommissionRulesModal } from './components/CommissionRulesModal';
import { CommissionsView } from './components/CommissionsView';
import { SaleSummaryPreviewModal } from './components/SaleSummaryPreviewModal';
import { SalesColumnsModal } from './components/SalesColumnsModal';
import { SalesDetailModal } from './components/SalesDetailModal';
import { SalesHeader } from './components/SalesHeader';
import { SalesView } from './components/SalesView';
import { SalesViewSwitcher } from './components/SalesViewSwitcher';
import { commissionMockRules } from './data/commissionMockData';
import { useSalesRecords } from './hooks/useSalesRecords';
import { useSalesTranslations } from './hooks/useSalesTranslations';
import type { CommissionRule, CommissionViewMode } from './types/commissions';
import type { SaleRecord } from './types/salesTypes';
import { calculateCommissionRecords } from './utils/commissionRules';
import { useSalesCrm } from '../salesCrmContext';

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

interface SalesProps {
  learningModeActive?: boolean;
}

export default function Sales({ learningModeActive = false }: SalesProps) {
  const t = useSalesTranslations();
  const navigate = useNavigate();
  const {
    quotes,
    products,
    contacts,
    opportunities,
    updateQuoteStatus,
    updateOpportunity,
  } = useSalesCrm();
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
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
    businessUnits,
    businesses,
    createSaleRecord,
    updateSaleRecord,
  } = useSalesRecords(preferredCurrency, exchangeRatesPerUsd);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isCommissionRulesOpen, setIsCommissionRulesOpen] = useState(false);
  const [activeView, setActiveView] = useState<CommissionViewMode>('sales');
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(commissionMockRules);
  const [selectedRecord, setSelectedRecord] = useState<SaleRecord | null>(null);
  const [summaryPreviewRecord, setSummaryPreviewRecord] = useState<SaleRecord | null>(null);
  const [commissionRecord, setCommissionRecord] = useState<SaleRecord | null>(null);
  const [pendingCancelRecord, setPendingCancelRecord] = useState<SaleRecord | null>(null);
  const commissionRecords = useMemo(() => calculateCommissionRecords(records, commissionRules), [commissionRules, records]);

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

  const handlePreviewSummary = (record: SaleRecord) => {
    setSummaryPreviewRecord(record);
    setIsSummaryPreviewOpen(true);
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

  return (
    <section className="space-y-5">
      <SalesHeader
        t={t}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onOpenCommissionRules={() => setIsCommissionRulesOpen(true)}
        onCreateSale={handleCreateSale}
      />

      <SalesViewSwitcher activeView={activeView} t={t} onViewChange={setActiveView} />

      {activeView === 'sales' ? (
        <SalesView
          learningModeActive={learningModeActive}
          records={records}
          filteredRecords={filteredRecords}
          metrics={metrics}
          filters={filters}
          visibleColumns={visibleColumns}
          lifecycleByRecordId={lifecycleByRecordId}
          sellers={sellers}
          customers={customers}
          businessUnits={businessUnits}
          businesses={businesses}
          t={t}
          onFiltersChange={setFilters}
          onViewRecord={handleViewRecord}
          onPreviewSummary={handlePreviewSummary}
          onManageCommission={handleManageCommission}
          onPrepareMovement={handlePrepareMovement}
          onSendToFinance={handleSendToFinance}
          onSendToCredit={handleSendToCredit}
          onCancelSale={handleCancelSale}
        />
      ) : (
        <CommissionsView
          learningModeActive={learningModeActive}
          sales={records}
          rules={commissionRules}
          t={t}
        />
      )}

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
        contacts={contacts}
        opportunities={opportunities}
        lifecycle={selectedRecord ? lifecycleByRecordId[selectedRecord.id] : undefined}
        commissionRecords={selectedRecord ? commissionRecords.filter((commission) => commission.saleId === selectedRecord.id) : []}
        t={t}
        onOpenChange={setIsDetailModalOpen}
        onCreate={createSaleRecord}
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

      <CommissionRulesModal
        open={isCommissionRulesOpen}
        rules={commissionRules}
        sales={records}
        t={t}
        onOpenChange={setIsCommissionRulesOpen}
        onRulesChange={setCommissionRules}
      />

      <SaleCancelDialog
        record={pendingCancelRecord}
        t={t}
        onCancel={() => setPendingCancelRecord(null)}
        onConfirm={handleConfirmCancelSale}
      />
    </section>
  );
}
