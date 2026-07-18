package com.indice.erp.pos.purchaseorder.kiosk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProcurementSupplierPortalLifecycleHandlerTest {

    @Mock ProcurementSupplierPortalAdminService supplierPortals;

    @Test
    void supportsOnlyTheExactProcurementSupplierPortalOwnerAndType() {
        var handler = handler();

        assertThat(handler.supports(definition("PROCUREMENT", "supplier_portal"))).isTrue();
        assertThat(handler.supports(definition("SALES", "supplier_portal"))).isFalse();
        assertThat(handler.supports(definition("PROCUREMENT", "customer_display"))).isFalse();
    }

    @Test
    void delegatesLifecycleTransitionToTheFunctionalSupplierPortalAuthority() {
        var definition = definition("PROCUREMENT", "supplier_portal");

        handler().transition(new KioskLifecycleTransition(
            definition, 10L, KioskDefinitionStatus.REVOKED, "  security incident  "));

        verify(supplierPortals).transitionFromCenter(
            7L, 10L, 18L, KioskDefinitionStatus.REVOKED, "security incident");
    }

    private ProcurementSupplierPortalLifecycleHandler handler() {
        return new ProcurementSupplierPortalLifecycleHandler(supplierPortals);
    }

    private KioskResolvedDefinition definition(String ownerModule, String kioskType) {
        return new KioskResolvedDefinition(
            17L, 7L, ownerModule, kioskType, 18L,
            "SUPPLIER-PORTAL-18", "Supplier portal", KioskDefinitionStatus.ACTIVE,
            3L, 4L, null, KioskAccessLevel.CONTROLLED, null,
            "...ABCD", false, 1, 1);
    }
}
