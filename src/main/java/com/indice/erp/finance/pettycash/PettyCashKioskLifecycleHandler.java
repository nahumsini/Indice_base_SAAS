package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for Petty Cash receipt-capture kiosks. */
@Component
public class PettyCashKioskLifecycleHandler implements KioskLifecycleHandler {

    private final PettyCashService pettyCash;

    public PettyCashKioskLifecycleHandler(PettyCashService pettyCash) {
        this.pettyCash = pettyCash;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return PettyCashKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && PettyCashKioskCapabilities.KIOSK_TYPE.equals(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        pettyCash.transitionKiosk(
            centerContext(transition), transition.legacyReferenceId(),
            transition.target(), transition.reason());
    }

    private FinanceContext centerContext(KioskLifecycleTransition transition) {
        return new FinanceContext(
            transition.actorId(), transition.companyId(), "Kiosk Center", "superadmin",
            true, FinanceScope.corporateOffice());
    }
}
