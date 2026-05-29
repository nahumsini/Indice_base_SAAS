import { useState } from 'react';
import { CommissionManagementModal } from './components/CommissionManagementModal';
import { SaleSummaryPreviewModal } from './components/SaleSummaryPreviewModal';
import { SalesColumnsModal } from './components/SalesColumnsModal';
import { SalesDetailModal } from './components/SalesDetailModal';
import { SalesFilters } from './components/SalesFilters';
import { SalesHeader } from './components/SalesHeader';
import { SalesInsightBar } from './components/SalesInsightBar';
import { SalesKpiStrip } from './components/SalesKpiStrip';
import { SalesTable } from './components/SalesTable';
import { useSalesRecords } from './hooks/useSalesRecords';
import { useSalesTranslations } from './hooks/useSalesTranslations';
import { salesOperationalGuidanceSections } from './operationalGuidance';
import type { SaleRecord } from './types/salesTypes';
import { useSalesCrm } from '../salesCrmContext';

export default function Sales() {
  const t = useSalesTranslations();
  const { quotes } = useSalesCrm();
  const {
    records,
    filteredRecords,
    metrics,
    filters,
    setFilters,
    visibleColumns,
    setVisibleColumns,
    sellers,
    customers,
    businessUnits,
    businesses,
    createSaleRecord,
    updateSaleRecord,
  } = useSalesRecords();
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSummaryPreviewOpen, setIsSummaryPreviewOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SaleRecord | null>(null);
  const [summaryPreviewRecord, setSummaryPreviewRecord] = useState<SaleRecord | null>(null);
  const [commissionRecord, setCommissionRecord] = useState<SaleRecord | null>(null);

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

  const handleCancelSale = (record: SaleRecord) => {
    if (!window.confirm(t.table.actions.cancelConfirmation)) {
      return;
    }

    updateSaleRecord(record.id, {
      commercialStatus: 'cancelled',
    });
  };

  return (
    <section className="space-y-5">
      <SalesHeader
        t={t}
        onOpenColumns={() => setIsColumnsModalOpen(true)}
        onCreateSale={handleCreateSale}
      />

      <SalesFilters
        filters={filters}
        businessUnits={businessUnits}
        businesses={businesses}
        sellers={sellers}
        customers={customers}
        t={t}
        onFiltersChange={setFilters}
      />

      <SalesKpiStrip metrics={metrics} t={t} />

      <SalesInsightBar
        metrics={metrics}
        visibleCount={filteredRecords.length}
        totalCount={records.length}
        t={t}
      />

      <SalesTable
        records={filteredRecords}
        visibleColumns={visibleColumns}
        t={t}
        onViewRecord={handleViewRecord}
        onPreviewSummary={handlePreviewSummary}
        onManageCommission={handleManageCommission}
        onPrepareMovement={handlePrepareMovement}
        onSendToFinance={handleSendToFinance}
        onCancelSale={handleCancelSale}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{t.guidance.title}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {salesOperationalGuidanceSections.map((section) => (
            <article key={section} className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4">
              <p className="text-sm font-black text-[#B63B32]">{t.guidance.sections[section].title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t.guidance.sections[section].body}</p>
            </article>
          ))}
        </div>
      </section>

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
        t={t}
        onOpenChange={setIsDetailModalOpen}
        onCreate={createSaleRecord}
        onUpdate={updateSaleRecord}
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
    </section>
  );
}
