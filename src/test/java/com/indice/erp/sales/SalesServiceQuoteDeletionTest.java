package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesServiceQuoteDeletionTest {

    @Mock SalesRepository salesRepository;
    @Mock SalesReferenceService referenceService;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock CompanyStorageMeter storageMeter;
    @Mock BusinessExchangeRateService businessExchangeRateService;
    @Mock KpiCurrencyAggregationService kpiCurrencyAggregationService;
    @Mock SalesProductAvailabilityLinkCodec availabilityLinkCodec;
    @Mock OpportunityFlowService opportunityFlowService;

    private SalesService service;

    @BeforeEach
    void setUp() {
        service = new SalesService(
                salesRepository,
                referenceService,
                objectStorageService,
                storageProperties,
                storageMeter,
                businessExchangeRateService,
                kpiCurrencyAggregationService,
                availabilityLinkCodec,
                opportunityFlowService);
    }

    @Test
    void deletesUnusedQuoteSoItNoLongerContributesToOpportunityPipeline() {
        when(salesRepository.countActiveQuoteDependents(7L, 41L)).thenReturn(0);

        service.delete(7L, "quotes", 41L);

        verify(salesRepository).lockQuoteForDeletion(7L, 41L);
        verify(salesRepository).softDelete(7L, SalesDefinitions.definitions().get("quotes"), 41L);
    }

    @Test
    void refusesToDeleteQuoteUsedByDownstreamCommercialRecords() {
        when(salesRepository.countActiveQuoteDependents(7L, 41L)).thenReturn(1);

        assertThatThrownBy(() -> service.delete(7L, "quotes", 41L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sale, contract, or post-sale");

        verify(salesRepository, never()).softDelete(7L, SalesDefinitions.definitions().get("quotes"), 41L);
    }

    @Test
    void softDeletesSaleWithoutDownstreamFinancialRecords() {
        when(salesRepository.countActiveSaleDependents(7L, 52L)).thenReturn(0);

        service.delete(7L, "sales", 52L);

        verify(salesRepository).lockSaleForDeletion(7L, 52L);
        verify(salesRepository).softDelete(7L, SalesDefinitions.definitions().get("sales"), 52L);
    }

    @Test
    void refusesToDeleteSaleWithCreditPosOrClosedCommissionRecords() {
        when(salesRepository.countActiveSaleDependents(7L, 52L)).thenReturn(1);

        assertThatThrownBy(() -> service.delete(7L, "sales", 52L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("credit account, POS ticket, or closed commission cut");

        verify(salesRepository, never()).softDelete(7L, SalesDefinitions.definitions().get("sales"), 52L);
    }

    @Test
    void softDeletesWarehouseWithoutCashRegisters() {
        when(salesRepository.countCashRegistersForWarehouse(7L, 74L)).thenReturn(0);

        service.delete(7L, "inventory-warehouses", 74L);

        verify(salesRepository).lockWarehouseForDeletion(7L, 74L);
        verify(salesRepository).softDelete(
                7L, SalesDefinitions.definitions().get("inventory-warehouses"), 74L);
    }

    @Test
    void refusesToDeleteWarehouseAssignedToCashRegisters() {
        when(salesRepository.countCashRegistersForWarehouse(7L, 74L)).thenReturn(1);

        assertThatThrownBy(() -> service.delete(7L, "inventory-warehouses", 74L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("assigned to one or more POS registers");

        verify(salesRepository).lockWarehouseForDeletion(7L, 74L);
        verify(salesRepository, never()).softDelete(
                7L, SalesDefinitions.definitions().get("inventory-warehouses"), 74L);
    }

    @Test
    void softDeletesAProductWithoutDestroyingItsHistoricalReferences() {
        service.delete(7L, "products", 63L);

        verify(salesRepository).softDelete(7L, SalesDefinitions.definitions().get("products"), 63L);
        verify(salesRepository).removeProductFromPublicCatalogs(7L, 63L);
        verify(salesRepository, never()).lockQuoteForDeletion(7L, 63L);
        verify(salesRepository, never()).lockSaleForDeletion(7L, 63L);
    }
}
