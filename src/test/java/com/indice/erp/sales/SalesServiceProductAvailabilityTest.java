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
class SalesServiceProductAvailabilityTest {

    @Mock SalesRepository repository;
    @Mock SalesReferenceService referenceService;
    @Mock ObjectStorageService objectStorageService;
    @Mock ObjectStorageProperties storageProperties;
    @Mock CompanyStorageMeter storageMeter;
    @Mock BusinessExchangeRateService exchangeRates;
    @Mock KpiCurrencyAggregationService currencies;
    @Mock SalesProductAvailabilityLinkCodec codec;
    @Mock OpportunityFlowService opportunityFlowService;
    @Mock SalesCollectionService collectionService;

    private SalesService service;
    private final SalesEntityDefinition products = SalesDefinitions.definitions().get("products");

    @BeforeEach
    void setUp() {
        service = new SalesService(repository, referenceService, objectStorageService,
            storageProperties, storageMeter, exchangeRates, currencies, codec, opportunityFlowService, collectionService, org.mockito.Mockito.mock(com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver.class, call -> java.time.ZoneOffset.UTC));
    }

    @Test
    void encryptsTheConfiguredLinkBeforeWritingIt() {
        when(repository.get(7L, products, 91L)).thenReturn(product(false, null));
        when(codec.protect("https://calendar.example.com/private.ics")).thenReturn("protected-link");

        service.update(7L, 5L, "products", 91L, Map.of(
            "reservable", true,
            "availabilityIcalUrl", "https://calendar.example.com/private.ics"));

        var payload = ArgumentCaptor.forClass(Map.class);
        verify(repository).update(eq(7L), eq(5L), eq(products), eq(91L), payload.capture());
        assertThat(payload.getValue())
            .containsEntry("reservable", true)
            .containsEntry("availabilityIcalUrl", "protected-link");
    }

    @Test
    void clearingReservableAlsoClearsTheStoredLink() {
        when(repository.get(7L, products, 91L)).thenReturn(product(true, "protected-link"));
        when(codec.reveal("protected-link")).thenReturn("https://calendar.example.com/private.ics");

        service.update(7L, 5L, "products", 91L, Map.of("reservable", false));

        var payload = ArgumentCaptor.forClass(Map.class);
        verify(repository).update(eq(7L), eq(5L), eq(products), eq(91L), payload.capture());
        assertThat(payload.getValue()).containsEntry("reservable", false);
        assertThat(payload.getValue()).containsKey("availabilityIcalUrl");
        assertThat(payload.getValue().get("availabilityIcalUrl")).isNull();
    }

    @Test
    void rejectsInsecureCalendarLinks() {
        when(repository.get(7L, products, 91L)).thenReturn(product(false, null));

        assertThatThrownBy(() -> service.update(7L, 5L, "products", 91L, Map.of(
            "reservable", true, "availabilityIcalUrl", "http://calendar.example.com/feed.ics")))
            .isInstanceOf(IllegalArgumentException.class);

        verify(repository, never()).update(eq(7L), eq(5L), eq(products), eq(91L), any());
    }

    private Map<String, Object> product(boolean reservable, String protectedUrl) {
        var product = new LinkedHashMap<String, Object>();
        product.put("id", 91L);
        product.put("name", "Reservable product");
        product.put("reservable", reservable);
        product.put("availabilityIcalUrl", protectedUrl);
        return product;
    }
}
