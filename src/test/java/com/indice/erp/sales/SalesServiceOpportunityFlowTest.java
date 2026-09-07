package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesServiceOpportunityFlowTest {

    @Mock SalesRepository repository;
    @Mock SalesReferenceService referenceService;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock CompanyStorageMeter storageMeter;
    @Mock BusinessExchangeRateService exchangeRates;
    @Mock KpiCurrencyAggregationService currencies;
    @Mock SalesProductAvailabilityLinkCodec availabilityLinkCodec;
    @Mock OpportunityFlowService opportunityFlowService;
    @Mock SalesCollectionService collectionService;

    private SalesService service;

    @BeforeEach
    void setUp() {
        service = new SalesService(repository, referenceService, objectStorageService,
                storageProperties, storageMeter, exchangeRates, currencies,
                availabilityLinkCodec, opportunityFlowService, collectionService, org.mockito.Mockito.mock(com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver.class, call -> java.time.ZoneOffset.UTC));
    }

    @Test
    void createsAnOpportunityInTheCompanyConfiguredInitialStage() {
        when(opportunityFlowService.defaultFlowId(7L)).thenReturn(3L);
        when(opportunityFlowService.initialStage(7L, 3L)).thenReturn("demo");
        when(opportunityFlowService.requireActiveStage(7L, 3L, "demo")).thenReturn("demo");
        when(opportunityFlowService.initializeOpportunity(7L, 5L, 91L, 3L, "demo"))
                .thenReturn(new OpportunityFlowService.MoveResult("demo", "OPEN", 40));
        when(repository.create(eq(7L), eq(5L), any(SalesEntityDefinition.class), any())).thenReturn(91L);
        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(91L)))
                .thenReturn(Map.of("id", 91L, "opportunityName", "Demo"));

        service.create(7L, 5L, "opportunities", Map.of("opportunityName", "Demo"));

        @SuppressWarnings("unchecked")
        var payload = ArgumentCaptor.forClass((Class<Map<String, Object>>) (Class<?>) Map.class);
        verify(repository).create(eq(7L), eq(5L), any(SalesEntityDefinition.class), payload.capture());
        assertThat(payload.getValue()).containsEntry("stage", "demo");
        verify(repository).update(eq(7L), eq(5L), any(SalesEntityDefinition.class), eq(91L),
                eq(Map.of("stage", "demo", "lifecycleStatus", "OPEN", "probabilityPercent", 40)));
    }

    @Test
    void rejectsAnInactiveStageBeforeWritingTheOpportunity() {
        when(opportunityFlowService.requireActiveStage(7L, 3L, "retired"))
                .thenThrow(new IllegalArgumentException("stage is not active"));

        assertThatThrownBy(() -> service.create(
                7L, 5L, "opportunities", Map.of(
                        "opportunityName", "Demo", "flowId", 3L, "stage", "retired")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not active");

        verify(repository, never()).create(
                eq(7L), eq(5L), any(SalesEntityDefinition.class), any());
    }

    @Test
    void linksApprovedQuoteWithoutClosingTheOpportunity() {
        var quote = new LinkedHashMap<String, Object>(Map.of(
                "id", 44L, "status", "approved", "amount", 1250, "currency", "MXN"));
        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(44L))).thenReturn(quote);

        service.connectQuote(7L, 5L, 44L, Map.of(
                "mode", "existing_opportunity", "opportunityId", 91L));

        verify(repository).linkQuoteToOpportunity(7L, 44L, 91L, "assigned_to_existing_opportunity");
        verify(opportunityFlowService, never()).closeOpportunityAsWon(7L, 5L, 91L);
    }

    @Test
    void closesExistingOpportunityWhenLinkedQuoteIsWon() {
        var quote = new LinkedHashMap<String, Object>(Map.of(
                "id", 44L, "status", "closed_won", "amount", 1250, "currency", "MXN"));
        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(44L))).thenReturn(quote);
        when(opportunityFlowService.closeOpportunityAsWon(7L, 5L, 91L))
                .thenReturn(new OpportunityFlowService.MoveResult("won", "WON", 100));

        service.connectQuote(7L, 5L, 44L, Map.of(
                "mode", "existing_opportunity", "opportunityId", 91L));

        verify(repository).linkQuoteToOpportunity(7L, 44L, 91L, "assigned_to_existing_opportunity");
        verify(repository).update(eq(7L), eq(5L), any(SalesEntityDefinition.class), eq(91L), eq(Map.of(
                "stage", "won",
                "lifecycleStatus", "WON",
                "probabilityPercent", 100,
                "estimatedValue", 1250,
                "currency", "MXN")));
    }
}
