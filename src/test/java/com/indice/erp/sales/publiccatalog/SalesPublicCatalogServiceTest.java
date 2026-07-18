package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PublicItem;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.PurchaseRequest;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestItem;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestItemResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.RequestResponse;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SaveRequest;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class SalesPublicCatalogServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-18T12:00:00Z");

    @Mock
    private SalesPublicCatalogRepository repository;
    @Mock
    private KioskRegistryService registry;

    private SalesPublicCatalogService service;

    @BeforeEach
    void setUp() {
        service = new SalesPublicCatalogService(
            repository, registry, new ObjectMapper(), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void submitsReviewableRequestUsingCurrentServerPricesEvenWhenPricesAreHidden() {
        var catalog = catalog(false);
        var request = new PurchaseRequest(
            "Ana", "ana@example.com", "email", "Favor de confirmar",
            List.of(new RequestItem(91L, new BigDecimal("3"))));
        var stored = new RequestResponse(
            41L, catalog.id(), "PCR-20260718-A1B2C3D4", "SUBMITTED",
            "Ana", "ana@example.com", "email", "Favor de confirmar", "MXN", 1,
            new BigDecimal("300.0000"), NOW, List.of());
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));
        given(repository.insertRequest(
            eq(catalog), anyString(), eq(request), eq("MXN"), eq(1),
            eq(new BigDecimal("300.0000")))).willReturn(41L);
        given(repository.findRequest(catalog.companyId(), 41L)).willReturn(Optional.of(stored));

        var result = service.submit(catalog.id(), request);

        assertThat(result).isSameAs(stored);
        var line = ArgumentCaptor.forClass(RequestItemResponse.class);
        then(repository).should().insertRequestItem(
            eq(catalog.companyId()), eq(41L), line.capture(), anyInt());
        assertThat(line.getValue().unitPrice()).isEqualByComparingTo("100.0000");
        assertThat(line.getValue().lineTotal()).isEqualByComparingTo("300.0000");
        then(repository).should().audit(
            eq(catalog.companyId()), eq(catalog.id()), eq(41L),
            eq("PUBLIC_CATALOG_REQUEST_SUBMITTED"), eq(null), any(), any(), anyString());
    }

    @Test
    void rejectsProductsThatAreNotPartOfThePublishedCatalog() {
        var catalog = catalog(true);
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));

        assertThatThrownBy(() -> service.submit(catalog.id(), new PurchaseRequest(
            "Ana", "5551234567", "phone", null,
            List.of(new RequestItem(999L, BigDecimal.ONE)))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("not in this catalog");

    }

    @Test
    void redactsEstimatedTotalFromPublicAcknowledgementWhenPricesAreHidden() {
        var catalog = catalog(false);
        var request = new PurchaseRequest(
            "Ana", "ana@example.com", "email", null,
            List.of(new RequestItem(91L, BigDecimal.ONE)));
        var stored = new RequestResponse(
            42L, catalog.id(), "PCR-20260718-E5F6G7H8", "SUBMITTED",
            "Ana", "ana@example.com", "email", null, "MXN", 1,
            new BigDecimal("125.0000"), NOW, List.of());
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));
        given(repository.insertRequest(
            eq(catalog), anyString(), eq(request), eq("MXN"), eq(1),
            eq(new BigDecimal("125.0000")))).willReturn(42L);
        given(repository.findRequest(catalog.companyId(), 42L)).willReturn(Optional.of(stored));

        var result = service.submitPublic(definition(catalog), request);

        assertThat(result.reference()).isEqualTo(stored.requestNumber());
        assertThat(result.estimatedTotal()).isNull();
        @SuppressWarnings("unchecked")
        var receipt = (Map<String, Object>) new ObjectMapper().convertValue(result, Map.class);
        assertThat(receipt).containsOnlyKeys(
            "reference", "requestNumber", "status", "submissionPolicy",
            "currencyCode", "itemCount", "estimatedTotal");
        assertThat(receipt).doesNotContainKeys(
            "id", "catalogId", "customerName", "contact", "preferredContactMethod", "message", "items");
        assertThat(receipt.toString()).doesNotContain("Ana", "ana@example.com");
    }

    @Test
    void keepsRetailPriceInLinesAndReceiptWhenWholesalePricesAreHidden() {
        var catalog = catalog(true, false);
        var request = new PurchaseRequest(
            "Ana", "ana@example.com", "email", null,
            List.of(new RequestItem(91L, new BigDecimal("3"))));
        var stored = new RequestResponse(
            43L, catalog.id(), "PCR-20260718-I9J0K1L2", "SUBMITTED",
            "Ana", "ana@example.com", "email", null, "MXN", 1,
            new BigDecimal("375.0000"), NOW, List.of());
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));
        given(repository.insertRequest(
            eq(catalog), anyString(), eq(request), eq("MXN"), eq(1),
            eq(new BigDecimal("375.0000")))).willReturn(43L);
        given(repository.findRequest(catalog.companyId(), 43L)).willReturn(Optional.of(stored));

        var result = service.submitPublic(definition(catalog), request);

        assertThat(result.estimatedTotal()).isEqualByComparingTo("375.0000");
        var line = ArgumentCaptor.forClass(RequestItemResponse.class);
        then(repository).should().insertRequestItem(
            eq(catalog.companyId()), eq(43L), line.capture(), anyInt());
        assertThat(line.getValue().unitPrice()).isEqualByComparingTo("125.0000");
        assertThat(line.getValue().lineTotal()).isEqualByComparingTo("375.0000");
    }

    @Test
    void publicBootstrapContainsDisplayContextButNoInternalCatalogOrScopeIds() {
        var catalog = catalog(true);
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));

        var bootstrap = service.bootstrap(definition(catalog));

        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) new ObjectMapper().convertValue(bootstrap, Map.class);
        assertThat(payload).containsOnlyKeys(
            "code", "companyName", "unitName", "businessName", "title", "description",
            "coverImageUrl", "contactCtaLabel", "contactMethod", "contactValue", "showPrices",
            "showWholesalePrices", "showStockStatus", "showItemTypeBadges", "showCategories",
            "allowCart", "allowPurchaseRequest", "submissionPolicy", "items");
        assertThat(payload).doesNotContainKeys("catalogId", "companyId", "unitId", "businessId");
        assertThat(payload).containsEntry("companyName", catalog.companyName())
            .containsEntry("unitName", catalog.unitName())
            .containsEntry("businessName", catalog.businessName());
    }

    @Test
    void rejectsCrossTenantAndCrossScopeEngineDefinitionsBeforeServingOrAcceptingData() {
        var catalog = catalog(true);
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        var request = new PurchaseRequest(
            "Ana", "ana@example.com", "email", null,
            List.of(new RequestItem(91L, BigDecimal.ONE)));

        assertThatThrownBy(() -> service.bootstrap(definition(
            catalog, catalog.companyId() + 1, catalog.unitId(), catalog.businessId())))
            .isInstanceOf(java.util.NoSuchElementException.class)
            .hasMessage("Public catalog not found.");
        assertThatThrownBy(() -> service.submitPublic(definition(
            catalog, catalog.companyId(), catalog.unitId() + 1, catalog.businessId()), request))
            .isInstanceOf(java.util.NoSuchElementException.class)
            .hasMessage("Public catalog not found.");
        assertThatThrownBy(() -> service.bootstrap(definition(
            catalog, catalog.companyId(), catalog.unitId(), catalog.businessId() + 1)))
            .isInstanceOf(java.util.NoSuchElementException.class)
            .hasMessage("Public catalog not found.");

        then(repository).should(org.mockito.Mockito.never()).publicItems(any());
        then(registry).shouldHaveNoInteractions();
    }

    @Test
    void hidesStockTypeAndCategoryFieldsAtTheBackendBoundary() {
        var catalog = new SalesPublicCatalogRepository.CatalogRecord(
            17L, 7L, "Empresa", 11L, "Unidad", 12L, "Negocio", "CATALOGO-2026", "Catálogo 2026",
            "Catálogo público", "Descripción", null, "Solicitar", "email",
            "ventas@example.com", "ACTIVE", null, "tokenhint", true, true, false,
            false, false, true, true, 1L, NOW.minusSeconds(60), NOW.minusSeconds(60));
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));

        var item = service.bootstrap(catalog.id()).items().getFirst();

        assertThat(item.type()).isNull();
        assertThat(item.category()).isNull();
        assertThat(item.usesInventory()).isFalse();
        assertThat(item.publicInventoryStatus()).isNull();
    }

    @Test
    void exposesOnlyTheConfiguredStockBandAndNeverTheExactInventoryBalance() {
        var catalog = catalog(true);
        given(repository.findById(catalog.id())).willReturn(Optional.of(catalog));
        given(repository.publicItems(catalog)).willReturn(List.of(product()));

        var item = service.bootstrap(catalog.id()).items().getFirst();

        assertThat(item.usesInventory()).isTrue();
        assertThat(item.publicInventoryStatus()).isEqualTo("inStock");
    }

    @Test
    void rejectsCreationOutsideTheAdministratorsFrozenScope() {
        var access = SalesPublicCatalogAdminAccess.AdminContext.unit(5L, 7L, 11L);
        var request = new SaveRequest(
            "Catálogo", 99L, 100L, "Catálogo público", null, null, "Contactar", "email",
            "ventas@example.com", null, true, false, true, true, true, true, true,
            List.of(), null);

        assertThatThrownBy(() -> service.create(access, request))
            .isInstanceOf(SecurityException.class);

        then(repository).shouldHaveNoInteractions();
        then(registry).shouldHaveNoInteractions();
    }

    @Test
    void physicallyDeletesOnlyAfterRevocationAndKeepsAuditedWorkflowTransactional() {
        var catalog = catalog(true);
        var access = SalesPublicCatalogAdminAccess.AdminContext.corporate(5L, catalog.companyId());
        given(repository.find(catalog.companyId(), catalog.id())).willReturn(Optional.of(catalog));
        given(registry.requireByLegacyReference(
            catalog.companyId(), SalesPublicCatalogService.OWNER_MODULE, catalog.id()))
            .willReturn(new KioskResolvedDefinition(
                100L, catalog.companyId(), SalesPublicCatalogService.OWNER_MODULE,
                SalesPublicCatalogService.KIOSK_TYPE, catalog.id(), catalog.code(), catalog.name(),
                KioskDefinitionStatus.REVOKED, catalog.unitId(), catalog.businessId(), null,
                KioskAccessLevel.PUBLIC, null, catalog.tokenHint(), false, 1, 1));
        given(repository.physicalDelete(catalog.companyId(), catalog.id())).willReturn(true);

        service.delete(access, catalog.id(), "Catálogo sustituido");

        then(registry).should().deleteDefinition(
            catalog.companyId(), SalesPublicCatalogService.OWNER_MODULE, catalog.id(),
            access.userId(), "Catálogo sustituido");
        then(repository).should().physicalDelete(catalog.companyId(), catalog.id());
        then(repository).should().audit(
            eq(catalog.companyId()), eq(catalog.id()), eq(null), eq("PUBLIC_CATALOG_DELETED"),
            eq(access.userId()), any(), any(), anyString());
    }

    private SalesPublicCatalogRepository.CatalogRecord catalog(boolean showPrices) {
        return catalog(showPrices, true);
    }

    private SalesPublicCatalogRepository.CatalogRecord catalog(
            boolean showPrices,
            boolean showWholesalePrices) {
        return new SalesPublicCatalogRepository.CatalogRecord(
            17L, 7L, "Empresa", 11L, "Unidad", 12L, "Negocio", "CATALOGO-2026", "Catálogo 2026", "Catálogo público",
            "Descripción", null, "Solicitar", "email", "ventas@example.com", "ACTIVE", null,
            "tokenhint", showPrices, showWholesalePrices, true, true, true, true, true, 1L,
            NOW.minusSeconds(60), NOW.minusSeconds(60));
    }

    private PublicItem product() {
        return new PublicItem(
            91L, "Producto seguro", "SKU-91", "Product", "General", null, null, null,
            new BigDecimal("125.00"), new BigDecimal("100.00"), new BigDecimal("2"),
            "MXN", true, "inStock", true);
    }

    private KioskResolvedDefinition definition(SalesPublicCatalogRepository.CatalogRecord catalog) {
        return definition(catalog, catalog.companyId(), catalog.unitId(), catalog.businessId());
    }

    private KioskResolvedDefinition definition(
            SalesPublicCatalogRepository.CatalogRecord catalog,
            long companyId,
            Long unitId,
            Long businessId) {
        return new KioskResolvedDefinition(
            100L, companyId, SalesPublicCatalogService.OWNER_MODULE,
            SalesPublicCatalogService.KIOSK_TYPE, catalog.id(), catalog.code(), catalog.name(),
            KioskDefinitionStatus.ACTIVE, unitId, businessId, null,
            KioskAccessLevel.PUBLIC, catalog.expiresAt(), catalog.tokenHint(), false, 1, 1);
    }
}
