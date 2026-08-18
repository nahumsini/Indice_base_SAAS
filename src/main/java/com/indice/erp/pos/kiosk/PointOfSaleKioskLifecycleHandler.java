package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.customerdisplay.CustomerDisplayService;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.StatusRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for every currently registered POS kiosk. */
@Component
public class PointOfSaleKioskLifecycleHandler implements KioskLifecycleHandler {

    private final CustomerDisplayService customerDisplays;
    private final SelfServiceKioskService selfService;

    public PointOfSaleKioskLifecycleHandler(
            CustomerDisplayService customerDisplays,
            SelfServiceKioskService selfService) {
        this.customerDisplays = customerDisplays;
        this.selfService = selfService;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        if (!PointOfSaleKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())) {
            return false;
        }
        return PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(definition.kioskType())
            || PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE.equals(definition.kioskType())
            || PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE.equals(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        var context = new PosContext(
            transition.actorId(), transition.companyId(), "Kiosk Center", "superadmin",
            true, PosScope.corporateOffice());
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE.equals(
                transition.definition().kioskType())) {
            customerDisplays.transition(
                context, transition.definition().id(), transition.target(), transition.reason());
            return;
        }
        selfService.transition(
            context,
            transition.legacyReferenceId(),
            new StatusRequest(transition.target().name(), transition.reason()));
    }
}
