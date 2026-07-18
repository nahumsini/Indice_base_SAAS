package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Materializes provider scope changes outside a rejected public action transaction. */
@Service
public class ProcurementSupplierPortalScopeReconciler {

    private final PurchaseOrderRepository repository;
    private final KioskRegistryService registry;
    private final ProcurementKioskModuleAuditService moduleAudit;

    public ProcurementSupplierPortalScopeReconciler(
            PurchaseOrderRepository repository,
            KioskRegistryService registry,
            ProcurementKioskModuleAuditService moduleAudit) {
        this.repository = repository;
        this.registry = registry;
        this.moduleAudit = moduleAudit;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void disableIncomplete(
            KioskResolvedDefinition definition,
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        repository.pauseSupplierPortalForIncompleteScope(access.companyId(), access.id());
        registry.disableForInvalidScope(definition, "Supplier portal scope is incomplete");
        moduleAudit.systemSuccess(
            access.companyId(), access.id(), "SUPPLIER_PORTAL_SCOPE_INVALID",
            Map.of(
                "unit_id", access.unitId() == null ? "" : access.unitId(),
                "business_id", access.businessId() == null ? "" : access.businessId(),
                "sessions_revoked", true));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void synchronizeChangedScope(
            KioskResolvedDefinition definition,
            PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        registry.synchronizeScopeSnapshot(definition, access.unitId(), access.businessId());
        moduleAudit.systemSuccess(
            access.companyId(), access.id(), "SUPPLIER_PORTAL_SCOPE_CHANGED",
            Map.of("unit_id", access.unitId(), "business_id", access.businessId(),
                "sessions_revoked", true));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void disableUnavailableProvider(
            KioskResolvedDefinition definition,
            long accessId,
            String reason) {
        repository.pauseSupplierPortalForIncompleteScope(definition.companyId(), accessId);
        registry.disableForInvalidScope(definition, reason);
        moduleAudit.systemSuccess(
            definition.companyId(), accessId, "SUPPLIER_PORTAL_PROVIDER_UNAVAILABLE",
            Map.of("reason", reason, "sessions_revoked", true));
    }
}
