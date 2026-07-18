package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for Expenses accounts-payable kiosks. */
@Component
public class PayableKioskLifecycleHandler implements KioskLifecycleHandler {

    private final PayableKioskService payables;

    public PayableKioskLifecycleHandler(PayableKioskService payables) {
        this.payables = payables;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return PayableKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && PayableKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        payables.transition(
            centerContext(transition), transition.legacyReferenceId(),
            transition.target(), transition.reason());
    }

    private FinanceContext centerContext(KioskLifecycleTransition transition) {
        return new FinanceContext(
            transition.actorId(), transition.companyId(), "Kiosk Center", "superadmin",
            true, FinanceScope.corporateOffice());
    }
}
