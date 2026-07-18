package com.indice.erp.pos.purchaseorder.kiosk;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.sql.ResultSet;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalLifecycleReconcilerTest {

    @Mock JdbcTemplate jdbcTemplate;
    @Mock PurchaseOrderRepository repository;
    @Mock KioskRegistryService registry;
    @Mock ProcurementSupplierPortalScopeReconciler scopeReconciler;

    @Test
    void inactiveProviderMaterializesUnavailableLifecycleAndRevokesSessions() throws Exception {
        givenCandidate(true, false);
        var definition = definition(3L, 4L);
        given(registry.requireById(7L, 17L)).willReturn(definition);

        reconciler().reconcile();

        verify(scopeReconciler).disableUnavailableProvider(
            definition, 18L, "Supplier portal provider is inactive or deleted");
        verify(repository, never()).findSupplierPortalAccessByLegacyReference(7L, 18L);
    }

    @Test
    void changedProviderScopeSynchronizesDefinitionSnapshotAndSessionBoundary() throws Exception {
        givenCandidate(true, true);
        var definition = definition(3L, 4L);
        var access = access(9L, 10L);
        given(registry.requireById(7L, 17L)).willReturn(definition);
        given(repository.findSupplierPortalAccessByLegacyReference(7L, 18L))
            .willReturn(Optional.of(access));

        reconciler().reconcile();

        verify(scopeReconciler).synchronizeChangedScope(definition, access);
        verify(scopeReconciler, never()).disableIncomplete(any(), any());
        verify(scopeReconciler, never()).disableUnavailableProvider(
            any(), org.mockito.ArgumentMatchers.anyLong(), anyString());
    }

    private ProcurementSupplierPortalLifecycleReconciler reconciler() {
        return new ProcurementSupplierPortalLifecycleReconciler(
            jdbcTemplate, repository, registry, scopeReconciler);
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void givenCandidate(boolean accessPresent, boolean providerOperational)
            throws Exception {
        var rs = mock(ResultSet.class);
        given(rs.getLong("definition_id")).willReturn(17L);
        given(rs.getLong("company_id")).willReturn(7L);
        given(rs.getLong("legacy_reference_id")).willReturn(18L);
        given(rs.getBoolean("access_present")).willReturn(accessPresent);
        given(rs.getBoolean("provider_operational")).willReturn(providerOperational);
        given(jdbcTemplate.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
    }

    private KioskResolvedDefinition definition(Long unitId, Long businessId) {
        return new KioskResolvedDefinition(
            17L, 7L, "PROCUREMENT", "supplier_portal", 18L,
            "SUPPLIER-PORTAL-18", "Supplier portal", KioskDefinitionStatus.ACTIVE,
            unitId, businessId, null, KioskAccessLevel.CONTROLLED, null,
            "...ABCD", false, 1, 1);
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord access(
            Long unitId,
            Long businessId) {
        return new PurchaseOrderRepository.SupplierPortalAccessRecord(
            18L, 7L, "Indice", 80L, "Proveedor Norte", "proveedor@example.com",
            "PORTAL-ABC", "legacy-hash", "ACTIVE", null,
            "[\"procurement.catalog.read\"]", unitId, "Unidad", businessId, "Negocio");
    }
}
