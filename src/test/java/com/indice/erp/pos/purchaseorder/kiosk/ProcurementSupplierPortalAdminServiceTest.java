package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskGrantService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.kiosk.engine.KioskIdentityCredentialService.PersonalPinCredential;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessConfigurationRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessPinRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessStatusRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalAdminServiceTest {

    @Mock
    private PurchaseOrderService purchaseOrders;

    @Mock
    private PurchaseOrderRepository repository;

    @Mock
    private ProcurementSupplierPortalAdapter adapter;

    @Mock
    private KioskRegistryService registry;

    @Mock
    private KioskIdentityCredentialService credentials;

    @Mock
    private KioskGrantService grants;

    @Mock
    private ProcurementKioskModuleAuditService moduleAudit;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private KioskEngineFeatureFlags flags;

    @Test
    void crossBusinessContextRejectsEveryContextualMutationWithoutASecretResponse() {
        var context = new PosContext(
            10L, 7L, "Business admin", "admin", true,
            PosScope.businessOffice(2L, 99L));
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));
        var service = service();

        assertHidden(() -> service.transition(
            context, 31L, new SupplierPortalAccessStatusRequest("REVOKED"), "cross scope"));
        assertHidden(() -> service.rotatePin(
            context, 31L, new SupplierPortalAccessPinRequest("4821")));
        assertHidden(() -> service.updateConfiguration(
            context, 31L, new SupplierPortalAccessConfigurationRequest(
                "Hidden supplier portal", Instant.now().plusSeconds(3600))));
        assertHidden(() -> service.delete(context, 31L, "cross scope"));
        assertHidden(() -> service.grant(
            context, 31L, "PROVIDER", 80L, "*"));
        assertHidden(() -> service.revokeGrant(context, 31L, 901L));

        verify(registry, times(6)).requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L);
        verifyNoMoreInteractions(registry);
        verifyNoInteractions(
            purchaseOrders, repository, adapter, credentials, grants,
            moduleAudit, passwordEncoder);
    }

    @Test
    void missingAndCrossBusinessDefinitionsHaveTheSameFailClosedResult() {
        var context = new PosContext(
            10L, 7L, "Business admin", "admin", true,
            PosScope.businessOffice(2L, 99L));
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 404L))
            .thenThrow(new NoSuchElementException("Kiosk definition not found."));
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));
        var service = service();

        assertHidden(() -> service.definition(context, 404L));
        assertHidden(() -> service.definition(context, 31L));

        verifyNoInteractions(
            purchaseOrders, repository, adapter, credentials, grants,
            moduleAudit, passwordEncoder);
    }

    @Test
    void deleteRejectsActivePortalBeforeAnyMutation() {
        var context = context();
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));

        assertThatThrownBy(() -> service().delete(context, 31L, "cleanup"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("revoked or expired");

        verify(moduleAudit, never()).adminSuccess(
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyMap());
        verify(registry, never()).deleteDefinition(
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.any());
        verify(purchaseOrders, never()).deleteSupplierPortalAccess(context, 31L);
    }

    @Test
    void deleteRejectsDisabledPortalBeforeAnyMutation() {
        var context = context();
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(KioskDefinitionStatus.DISABLED, null));

        assertThatThrownBy(() -> service().delete(context, 31L, "cleanup"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("revoked or expired");

        verify(registry, never()).deleteDefinition(
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong(),
            org.mockito.ArgumentMatchers.any());
        verify(purchaseOrders, never()).deleteSupplierPortalAccess(context, 31L);
    }

    @Test
    void deleteAllowsRevokedPortalAndPersistsAuditBeforeRemovingRegistryAndLegacyLink() {
        var context = context();
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(KioskDefinitionStatus.REVOKED, null));
        when(repository.findSupplierPortalAccessForAdministration(7L, 31L))
            .thenReturn(Optional.of(access()));

        service().delete(context, 31L, "retention complete");

        InOrder ordered = inOrder(moduleAudit, repository, registry, purchaseOrders, credentials);
        ordered.verify(moduleAudit).adminSuccess(
            7L, 31L, 10L, "SUPPLIER_PORTAL_DELETED",
            java.util.Map.of(
                "terminal_status", "REVOKED", "reason", "retention complete",
                "provider_id", 80L, "kiosk_definition_id", 17L));
        ordered.verify(repository).snapshotSupplierPortalSubmissions(
            7L, 31L, 80L, 2L, 3L);
        ordered.verify(registry).deleteDefinition(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            31L, 10L, "retention complete");
        ordered.verify(purchaseOrders).deleteSupplierPortalAccess(context, 31L);
        ordered.verify(credentials).revokeIfUnreferenced(7L, "PROVIDER", 80L, false);
    }

    @Test
    void deleteTreatsElapsedActivePortalAsExpired() {
        var context = context();
        when(registry.requireByLegacyReference(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE, 31L))
            .thenReturn(definition(
                KioskDefinitionStatus.ACTIVE, Instant.now().minusSeconds(60)));
        when(repository.findSupplierPortalAccessForAdministration(7L, 31L))
            .thenReturn(Optional.of(access()));

        service().delete(context, 31L, "expired cleanup");

        verify(moduleAudit).adminSuccess(
            7L, 31L, 10L, "SUPPLIER_PORTAL_DELETED",
            java.util.Map.of(
                "terminal_status", "EXPIRED", "reason", "expired cleanup",
                "provider_id", 80L, "kiosk_definition_id", 17L));
        verify(repository).snapshotSupplierPortalSubmissions(7L, 31L, 80L, 2L, 3L);
        verify(registry).deleteDefinition(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            31L, 10L, "expired cleanup");
        verify(purchaseOrders).deleteSupplierPortalAccess(context, 31L);
    }

    @Test
    void createReusesAnExistingPersonalProviderPinWithoutRotatingOtherKiosks() {
        var request = new SupplierPortalAccessRequest(
            80L, "ignored-prefix", "4821", "ACTIVE", null);
        var created = createdResponse();
        when(purchaseOrders.createSupplierPortalAccess(context(), request)).thenReturn(created);
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access()));
        when(registry.registerLegacyDefinition(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            ProcurementSupplierPortalCapabilities.KIOSK_TYPE, 31L,
            "SUPPLIER-PORTAL-31", "Portal de Proveedor Norte", "ACTIVE",
            2L, 3L, null, "PORTAL-ABC", true, KioskAccessLevel.CONTROLLED,
            "procurement", "es-MX", 10L)).thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("existing-hash", "ACTIVE", "PERSONAL_ROTATION")));

        var response = service().create(context(), request);

        assertThat(response.personalPinCreated()).isFalse();
        verify(credentials, never()).rotatePersonalPin(
            org.mockito.ArgumentMatchers.anyLong(), any(),
            org.mockito.ArgumentMatchers.anyLong(), any());
        verify(grants).grant(definition(KioskDefinitionStatus.ACTIVE, null),
            "PROVIDER", 80L, "*", 10L);
        verify(moduleAudit).adminSuccess(
            7L, 31L, 10L, "SUPPLIER_PERSONAL_PIN_REUSED",
            java.util.Map.of("provider_id", 80L));
        verify(repository).updateSupplierPortalPinsForProvider(
            7L, 80L, "existing-hash", 10L);
    }

    @Test
    void createMaterializesPersonalPinWhenNoReusableCredentialExists() {
        var request = new SupplierPortalAccessRequest(80L, null, "4821", "ACTIVE", null);
        when(purchaseOrders.createSupplierPortalAccess(context(), request))
            .thenReturn(createdResponse());
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access()));
        when(registry.registerLegacyDefinition(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            ProcurementSupplierPortalCapabilities.KIOSK_TYPE, 31L,
            "SUPPLIER-PORTAL-31", "Portal de Proveedor Norte", "ACTIVE",
            2L, 3L, null, "PORTAL-ABC", true, KioskAccessLevel.CONTROLLED,
            "procurement", "es-MX", 10L)).thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.empty());
        when(passwordEncoder.encode("4821")).thenReturn("new-personal-hash");

        var response = service().create(context(), request);

        assertThat(response.personalPinCreated()).isTrue();
        verify(credentials).rotatePersonalPin(7L, "PROVIDER", 80L, "new-personal-hash");
        verify(moduleAudit).adminSuccess(
            7L, 31L, 10L, "SUPPLIER_PERSONAL_PIN_CREATED",
            java.util.Map.of("provider_id", 80L, "sessions_revoked", true));
        verify(moduleAudit, never()).adminSuccess(
            7L, 31L, 10L, "SUPPLIER_PERSONAL_PIN_REUSED",
            java.util.Map.of("provider_id", 80L));
        verify(repository).updateSupplierPortalPinsForProvider(
            7L, 80L, "new-personal-hash", 10L);
    }

    @Test
    void featureFlagOffUsesLegacyCreationAndStillDualWritesRegistryGrantAndPersonalPin() {
        var request = new SupplierPortalAccessRequest(
            80L, "LEGACY-CUSTOM", "4821", "ACTIVE", null);
        when(purchaseOrders.createSupplierPortalAccessLegacy(context(), request))
            .thenReturn(createdResponse());
        when(repository.findSupplierPortalAccessByCode("PORTAL-ABC"))
            .thenReturn(Optional.of(access()));
        when(registry.registerLegacyDefinition(
            7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            ProcurementSupplierPortalCapabilities.KIOSK_TYPE, 31L,
            "SUPPLIER-PORTAL-31", "Portal de Proveedor Norte", "ACTIVE",
            2L, 3L, null, "PORTAL-ABC", true, KioskAccessLevel.CONTROLLED,
            "procurement", "es-MX", 10L)).thenReturn(definition(KioskDefinitionStatus.ACTIVE, null));
        when(credentials.pinCredential(7L, "PROVIDER", 80L)).thenReturn(Optional.of(
            new PersonalPinCredential("legacy-compatible-hash", "ACTIVE", "PERSONAL_ROTATION")));

        var response = legacyService().create(context(), request);

        assertThat(response.personalPinCreated()).isFalse();
        verify(purchaseOrders).createSupplierPortalAccessLegacy(context(), request);
        verify(purchaseOrders, never()).createSupplierPortalAccess(context(), request);
        verify(repository).updateSupplierPortalPinsForProvider(
            7L, 80L, "legacy-compatible-hash", 10L);
        verify(registry).synchronizeCapabilities(
            org.mockito.ArgumentMatchers.eq(definition(KioskDefinitionStatus.ACTIVE, null)),
            org.mockito.ArgumentMatchers.anySet());
        verify(grants).grant(
            definition(KioskDefinitionStatus.ACTIVE, null), "PROVIDER", 80L, "*", 10L);
    }

    private ProcurementSupplierPortalAdminService service() {
        lenient().when(flags.registryEnabled()).thenReturn(true);
        lenient().when(flags.sessionsEnabled()).thenReturn(true);
        lenient().when(flags.auditEnabled()).thenReturn(true);
        lenient().when(flags.adapterEnabled(ProcurementSupplierPortalCapabilities.OWNER_MODULE))
            .thenReturn(true);
        return new ProcurementSupplierPortalAdminService(
            purchaseOrders, repository, adapter, registry, credentials, grants,
            moduleAudit, passwordEncoder, flags);
    }

    private ProcurementSupplierPortalAdminService legacyService() {
        return new ProcurementSupplierPortalAdminService(
            purchaseOrders, repository, adapter, registry, credentials, grants,
            moduleAudit, passwordEncoder, flags);
    }

    private PosContext context() {
        return new PosContext(
            10L, 7L, "Buyer", "admin", true, PosScope.corporateOffice());
    }

    private KioskResolvedDefinition definition(
            KioskDefinitionStatus status,
            Instant expiresAt) {
        return new KioskResolvedDefinition(
            17L, 7L, ProcurementSupplierPortalCapabilities.OWNER_MODULE,
            ProcurementSupplierPortalCapabilities.KIOSK_TYPE, 31L,
            "SUPPLIER-PORTAL-31", "Supplier portal", status,
            2L, 3L, null, KioskAccessLevel.CONTROLLED, expiresAt,
            "...ABCD", false, 1, 1);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access() {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            31L, 7L, "Indice", 80L, "Proveedor Norte", "proveedor@example.com",
            "PORTAL-ABC", "legacy-hash", "ACTIVE", null,
            "[\"procurement.catalog.read\"]", 2L, "Unidad Norte", 3L, "Negocio Norte");
    }

    private SupplierPortalAccessResponse createdResponse() {
        var now = Instant.parse("2026-07-18T12:00:00Z");
        return new SupplierPortalAccessResponse(
            31L, 80L, "Proveedor Norte", "proveedor@example.com", "PORTAL-ABC",
            "/supplier-portal/PORTAL-ABC", "ACTIVE", null, now, now, false);
    }

    private void assertHidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation)
            .isExactlyInstanceOf(NoSuchElementException.class)
            .hasMessage("Supplier portal kiosk not found.");
    }
}
