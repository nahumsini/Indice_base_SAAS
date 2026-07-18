package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for Procurement supplier portals. */
@Component
public class ProcurementSupplierPortalLifecycleHandler implements KioskLifecycleHandler {

    private final ProcurementSupplierPortalAdminService supplierPortals;

    public ProcurementSupplierPortalLifecycleHandler(
            ProcurementSupplierPortalAdminService supplierPortals) {
        this.supplierPortals = supplierPortals;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return ProcurementSupplierPortalCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && ProcurementSupplierPortalCapabilities.KIOSK_TYPE.equals(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        supplierPortals.transitionFromCenter(
            transition.companyId(), transition.actorId(), transition.legacyReferenceId(),
            transition.target(), transition.reason());
    }
}
