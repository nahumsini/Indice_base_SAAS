package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskFileIntentService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalCatalogProduct;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalContextResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import com.indice.erp.storage.ObjectStorageProperties;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalAdapterTest {

    @Mock PurchaseOrderRepository repository;
    @Mock PurchaseOrderService service;
    @Mock ProcurementSupplierPortalIdentityService identities;
    @Mock ProcurementKioskModuleAuditService moduleAudit;
    @Mock KioskFileIntentService fileIntents;
    @Mock ObjectStorageProperties storageProperties;
    @Mock Validator validator;
    @Mock ProcurementSupplierPortalScopeReconciler scopeReconciler;

    @Test
    void intersectsProviderSessionWithPerPortalCapabilities() {
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(access("[\"procurement.catalog.read\"]")));
        var context = context(80L);

        assertThat(adapter().authorize(context, KioskActionRequest.of(
            ProcurementSupplierPortalCapabilities.CATALOG_READ, Map.of())).allowed()).isTrue();
        assertThat(adapter().authorize(context, KioskActionRequest.of(
            ProcurementSupplierPortalCapabilities.INVOICE_SUBMIT, Map.of())).allowed()).isFalse();
    }

    @Test
    void rejectsAValidProviderSessionFromAnotherIdentity() {
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(access("[\"procurement.catalog.read\"]")));

        assertThat(adapter().authorize(context(81L), KioskActionRequest.of(
            ProcurementSupplierPortalCapabilities.CATALOG_READ, Map.of())).allowed()).isFalse();
    }

    @Test
    void requiresTheExactPortalAccessResourceForFileCapabilities() {
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(access("[\"procurement.invoice.document.presign\"]")));

        assertThat(adapter().authorize(context(80L), KioskActionRequest.forResource(
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN, 18L, Map.of()))
            .allowed()).isTrue();
        assertThat(adapter().authorize(context(80L), KioskActionRequest.forResource(
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN, 19L, Map.of()))
            .allowed()).isFalse();
        assertThat(adapter().authorize(context(80L), KioskActionRequest.of(
            ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN, Map.of()))
            .allowed()).isFalse();
    }

    @Test
    void bootstrapDoesNotExposeProviderIdentityOrCredential() {
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(access("[\"procurement.catalog.read\"]")));

        assertThat(adapter().bootstrap(context(null)))
            .containsEntry("status", "ACTIVE")
            .doesNotContainKeys("providerId", "providerName", "providerEmail", "pin", "pinHash");
    }

    @Test
    void canonicalCatalogContextKeepsFunctionalDataButOmitsInternalIdsAndPortalSecret() {
        var access = access("[\"procurement.catalog.read\"]");
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(access));
        when(service.supplierPortalContext(access)).thenReturn(new SupplierPortalContextResponse(
            18L, "PORTAL-ABC", 80L, "Proveedor Norte", "proveedor@example.com", "ACTIVE",
            List.of(new SupplierPortalCatalogProduct(
                44L, "Insumo", "SKU-44", "PROV-44", new BigDecimal("125.50"),
                "MXN", 3, BigDecimal.ONE))));

        var response = adapter().execute(context(80L), KioskActionRequest.of(
            ProcurementSupplierPortalCapabilities.CATALOG_READ, Map.of()));

        assertThat(response)
            .containsEntry("providerName", "Proveedor Norte")
            .containsEntry("providerEmail", "proveedor@example.com")
            .containsEntry("companyName", "Indice")
            .containsEntry("unitName", "Unidad Norte")
            .containsEntry("businessName", "Negocio Norte")
            .containsKey("catalogProducts")
            .doesNotContainKeys("portalAccessId", "portalCode", "providerId", "pin", "pinHash");
    }

    @Test
    void incompleteProviderScopeIsDisabledAndCannotBootstrap() {
        var incomplete = access("[\"procurement.catalog.read\"]", null, 4L);
        when(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .thenReturn(Optional.of(incomplete));

        assertThatThrownBy(() -> adapter().bootstrap(context(null)))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Supplier portal scope is incomplete.");
        verify(scopeReconciler).disableIncomplete(context(null).definition(), incomplete);
    }

    private ProcurementSupplierPortalAdapter adapter() {
        return new ProcurementSupplierPortalAdapter(
            repository, service, identities, moduleAudit, fileIntents, storageProperties,
            new ObjectMapper(), validator, scopeReconciler
        );
    }

    private KioskExecutionContext context(Long providerId) {
        var definition = new KioskResolvedDefinition(
            100L, 7L, "PROCUREMENT", "supplier_portal", 18L,
            "PORTAL-ABC", "Portal proveedor", KioskDefinitionStatus.ACTIVE,
            3L, 4L, null, KioskAccessLevel.CONTROLLED, null,
            "RTAL-ABC", true, 1, 1
        );
        KioskSessionPrincipal session = providerId == null ? null : new KioskSessionPrincipal(
            "session-1", 100L, 7L, "PROVIDER", providerId,
            Set.of("procurement.catalog.read@1"), Instant.now().plusSeconds(300)
        );
        return KioskExecutionContext.publicLink("PROCUREMENT", "PORTAL-ABC")
            .resolved(definition, session);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(String capabilities) {
        return access(capabilities, 3L, 4L);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(
            String capabilities,
            Long unitId,
            Long businessId) {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 7L, "Indice", 80L, "Proveedor Norte", "proveedor@example.com",
            "PORTAL-ABC", "legacy-hash", "ACTIVE", null,
            capabilities, unitId, unitId == null ? null : "Unidad Norte",
            businessId, businessId == null ? null : "Negocio Norte"
        );
    }
}
