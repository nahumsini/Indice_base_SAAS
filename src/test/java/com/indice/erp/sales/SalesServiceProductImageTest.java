package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SalesServiceProductImageTest {

    @Mock SalesRepository repository;
    @Mock SalesReferenceService referenceService;
    @Mock ObjectStorageService objectStorageService;
    @Mock CompanyStorageMeter storageMeter;
    @Mock BusinessExchangeRateService exchangeRates;
    @Mock KpiCurrencyAggregationService currencies;
    @Mock SalesProductAvailabilityLinkCodec availabilityLinkCodec;
    @Mock OpportunityFlowService opportunityFlowService;

    private ObjectStorageProperties storageProperties;
    private SalesService service;

    @BeforeEach
    void setUp() {
        storageProperties = new ObjectStorageProperties();
        storageProperties.getMinio().setBucketSalesDocuments("indice-sales-documents");
        storageProperties.getMinio().setPresignExpirySeconds(900);
        service = new SalesService(repository, referenceService, objectStorageService,
            storageProperties, storageMeter, exchangeRates, currencies, availabilityLinkCodec,
            opportunityFlowService);
    }

    @Test
    void registeringTheSameUploadedImageRetryIsIdempotent() {
        var objectKey = "sales/products/7/images/retry-product.webp";
        var existing = new LinkedHashMap<String, Object>();
        existing.put("id", 61L);
        existing.put("entityType", "product");
        existing.put("entityId", 44L);
        existing.put("fileKind", "product_image");
        existing.put("objectKey", objectKey);

        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(44L)))
            .thenReturn(Map.of("id", 44L));
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.objectExists("indice-sales-documents", objectKey)).thenReturn(true);
        when(repository.findFileByObjectKey(7L, objectKey)).thenReturn(existing);
        when(objectStorageService.presignDownload("indice-sales-documents", objectKey, 900))
            .thenReturn("https://catalog.example/storage/signed-product.webp");

        var result = service.registerProductImage(7L, 9L, 44L, Map.of("objectKey", objectKey));

        assertThat(result.get("id")).isEqualTo(61L);
        assertThat(result.get("url")).isEqualTo("https://catalog.example/storage/signed-product.webp");
        verify(storageMeter, never()).commit(anyLong(), any(String.class), any(String.class), anyLong());
        verify(repository, never()).createFile(anyLong(), anyLong(), any());
    }

    @SuppressWarnings("unchecked")
    @Test
    void productSaveKeepsTenantObjectKeysButNeverPersistsTheirSignedUrls() {
        var validObjectKey = "sales/products/7/images/product.webp";
        var payload = Map.<String, Object>of(
            "name", "Producto con foto",
            "sku", "PHOTO-001",
            "metadata", Map.of(
                "imageUrl", "https://old.example/storage/signed-product.webp",
                "gallery", List.of(
                    Map.of("id", "valid", "url", "https://old.example/storage/signed-product.webp",
                        "objectKey", validObjectKey),
                    Map.of("id", "foreign", "url", "https://old.example/storage/foreign.webp",
                        "objectKey", "sales/products/8/images/foreign.webp"),
                    Map.of("id", "external", "url", "https://images.example/external.webp"))));
        when(repository.create(eq(7L), eq(9L), any(SalesEntityDefinition.class), any())).thenReturn(44L);
        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(44L)))
            .thenReturn(new LinkedHashMap<>(Map.of("id", 44L, "metadata", Map.of())));

        service.create(7L, 9L, "products", payload);

        var savedPayload = org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(repository).create(eq(7L), eq(9L), any(SalesEntityDefinition.class), savedPayload.capture());
        var metadata = (Map<String, Object>) savedPayload.getValue().get("metadata");
        var gallery = (List<Map<String, Object>>) metadata.get("gallery");
        assertThat(metadata).doesNotContainKey("imageUrl");
        assertThat(gallery).hasSize(2);
        assertThat(gallery.get(0))
            .containsEntry("objectKey", validObjectKey)
            .doesNotContainKey("url");
        assertThat(gallery.get(1)).containsEntry("url", "https://images.example/external.webp");
    }

    @SuppressWarnings("unchecked")
    @Test
    void productReadRefreshesThePrimarySignedUrlAndIgnoresForeignObjectKeys() {
        var validObjectKey = "sales/products/7/images/product.webp";
        var item = new LinkedHashMap<String, Object>();
        item.put("id", 44L);
        item.put("metadata", Map.of(
            "imageUrl", "https://expired.example/storage/product.webp",
            "gallery", List.of(
                Map.of("id", "valid", "url", "https://expired.example/storage/product.webp",
                    "objectKey", validObjectKey),
                Map.of("id", "foreign", "objectKey", "sales/products/8/images/foreign.webp"))));
        when(repository.get(eq(7L), any(SalesEntityDefinition.class), eq(44L))).thenReturn(item);
        when(repository.listFiles(7L, "product", 44L)).thenReturn(List.of());
        when(objectStorageService.isEnabled()).thenReturn(true);
        when(objectStorageService.presignDownload("indice-sales-documents", validObjectKey, 900))
            .thenReturn("https://catalog.example/storage/fresh-product.webp");

        var result = service.get(7L, "products", 44L);

        var metadata = (Map<String, Object>) result.get("metadata");
        var gallery = (List<Map<String, Object>>) metadata.get("gallery");
        assertThat(metadata.get("imageUrl")).isEqualTo("https://catalog.example/storage/fresh-product.webp");
        assertThat(gallery).hasSize(1);
        assertThat(gallery.get(0).get("url")).isEqualTo("https://catalog.example/storage/fresh-product.webp");
    }
}
