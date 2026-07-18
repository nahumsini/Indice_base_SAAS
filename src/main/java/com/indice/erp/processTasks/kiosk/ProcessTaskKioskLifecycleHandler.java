package com.indice.erp.processTasks.kiosk;

import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for Process & Tasks kiosks. */
@Component
public class ProcessTaskKioskLifecycleHandler implements KioskLifecycleHandler {

    private final ProcessTaskKioskService kiosks;

    public ProcessTaskKioskLifecycleHandler(ProcessTaskKioskService kiosks) {
        this.kiosks = kiosks;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return ProcessTaskKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        kiosks.transitionKiosk(
            transition.companyId(), transition.actorId(), transition.legacyReferenceId(),
            transition.target(), transition.reason());
    }
}
