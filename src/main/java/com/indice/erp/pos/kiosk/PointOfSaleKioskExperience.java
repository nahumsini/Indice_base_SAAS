package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.Map;
import java.util.Set;

/** One typed kiosk experience owned by the shared Point of Sale adapter. */
public interface PointOfSaleKioskExperience {

    String kioskType();

    Set<KioskCapabilityDescriptor> capabilities();

    Map<String, Object> bootstrap(KioskExecutionContext context);

    default KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        return KioskAuthorization.allow();
    }

    default KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        return KioskValidationResult.success();
    }

    Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request);

    default boolean supports(String capabilityKey) {
        return capabilities().stream().anyMatch(capability -> capability.key().equals(capabilityKey));
    }
}
