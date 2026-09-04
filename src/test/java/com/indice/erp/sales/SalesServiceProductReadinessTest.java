package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.exchange.BusinessExchangeRateService;
import com.indice.erp.kpis.currency.KpiCurrencyAggregationService;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesServiceProductReadinessTest {

    @Mock SalesRepository repository;
    @Mock SalesReferenceService referenceService;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock CompanyStorageMeter storageMeter;
    @Mock BusinessExchangeRateService exchangeRates;
    @Mock KpiCurrencyAggregationService currencies;
    @Mock SalesProductAvailabilityLinkCodec availabilityLinkCodec;
    @Mock OpportunityFlowService opportunityFlowService;

    private SalesService service;
    private final SalesEntityDefinition products = SalesDefinitions.definitions().get("products");

    @BeforeEach
    void setUp() {
        service = new SalesService(repository, referenceService, objectStorageService,
                storageProperties, storageMeter, exchangeRates, currencies,
                availabilityLinkCodec, opportunityFlowService);
    }

    @Test
    void getReturnsTheBackwardCompatibleReadyContract() {
        when(repository.get(7L, products, 91L)).thenReturn(product(
                91L, "Active", "Product", "Commercial", new BigDecimal("125.50")));

        var result = service.get(7L, "products", 91L);

        assertThat(result)
                .containsEntry("readyForSales", true)
                .containsEntry("salesReadiness", "READY")
                .containsEntry("salesReadinessReasons", List.of());
    }

    @Test
    void listReturnsStableReasonsAndFailsClosedForInvalidPrices() {
        var rows = new ArrayList<Map<String, Object>>();
        rows.add(product(1L, "active", "service", "quote_only", null));
        rows.add(product(2L, "draft", "operational_item", "internal", "not-a-number"));
        rows.add(product(3L, "inactive", "product", "commercial", BigDecimal.TEN));
        when(repository.list(7L, products, Map.of())).thenReturn(rows);

        var response = service.list(7L, "products", Map.of());

        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) response.get("items");
        assertThat(items.get(0))
                .containsEntry("readyForSales", false)
                .containsEntry("salesReadiness", "REQUIRES_REVIEW")
                .containsEntry("salesReadinessReasons", List.of("MISSING_PRICE"));
        assertThat(items.get(1))
                .containsEntry("readyForSales", false)
                .containsEntry("salesReadiness", "NOT_READY")
                .containsEntry("salesReadinessReasons", List.of(
                        "DRAFT", "INTERNAL", "MISSING_PRICE"));
        assertThat(items.get(2))
                .containsEntry("salesReadiness", "NOT_READY")
                .containsEntry("salesReadinessReasons", List.of("INACTIVE"));
    }

    @Test
    void explicitCommercialVisibilityMakesAnOperationalItemSellable() {
        when(repository.get(7L, products, 94L)).thenReturn(product(
                94L, "active", "operational_item", "commercial", BigDecimal.TEN));

        var result = service.get(7L, "products", 94L);

        assertThat(result)
                .containsEntry("readyForSales", true)
                .containsEntry("salesReadiness", "READY")
                .containsEntry("salesReadinessReasons", List.of());
    }

    @Test
    void createReturnsTheDerivedContractFromThePersistedProduct() {
        when(repository.create(eq(7L), eq(5L), eq(products), org.mockito.ArgumentMatchers.anyMap()))
                .thenReturn(92L);
        when(repository.get(7L, products, 92L)).thenReturn(product(
                92L, "active", "product", "pos_ready", "30.00"));

        var result = service.create(7L, 5L, "products", Map.of(
                "name", "POS product",
                "status", "active",
                "type", "product",
                "visibility", "pos_ready",
                "price", "30.00"));

        assertThat(result)
                .containsEntry("readyForSales", true)
                .containsEntry("salesReadiness", "READY")
                .containsEntry("salesReadinessReasons", List.of());
    }

    @Test
    void updateRecomputesReadinessAndNeverPersistsClientDerivedValues() {
        when(repository.get(7L, products, 93L))
                .thenReturn(
                        product(93L, "active", "product", "commercial", BigDecimal.TEN),
                        product(93L, "active", "product", "commercial", BigDecimal.ZERO));
        var clientPayload = new LinkedHashMap<String, Object>();
        clientPayload.put("price", BigDecimal.ZERO);
        clientPayload.put("readyForSales", true);
        clientPayload.put("salesReadiness", "READY");
        clientPayload.put("salesReadinessReasons", List.of());

        var result = service.update(7L, 5L, "products", 93L, clientPayload);

        var persistedPayload = ArgumentCaptor.forClass(Map.class);
        verify(repository).update(eq(7L), eq(5L), eq(products), eq(93L), persistedPayload.capture());
        assertThat(persistedPayload.getValue())
                .doesNotContainKeys("readyForSales", "salesReadiness", "salesReadinessReasons");
        assertThat(result)
                .containsEntry("readyForSales", false)
                .containsEntry("salesReadiness", "REQUIRES_REVIEW")
                .containsEntry("salesReadinessReasons", List.of("MISSING_PRICE"));
    }

    private Map<String, Object> product(
            long id,
            Object status,
            Object type,
            Object visibility,
            Object price) {
        var product = new LinkedHashMap<String, Object>();
        product.put("id", id);
        product.put("name", "Product " + id);
        product.put("status", status);
        product.put("type", type);
        product.put("visibility", visibility);
        product.put("price", price);
        product.put("reservable", false);
        return product;
    }
}
