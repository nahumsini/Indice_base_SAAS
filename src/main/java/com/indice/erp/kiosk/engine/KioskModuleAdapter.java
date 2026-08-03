package com.indice.erp.kiosk.engine;

import java.util.Map;
import java.util.Set;

public interface KioskModuleAdapter {

    String ownerModule();

    Set<KioskCapabilityDescriptor> capabilities();

    /**
     * Capabilities exposed by one concrete kiosk type. Most legacy adapters own
     * a single type and keep the default. Multi-experience modules (for example
     * POS) must narrow the catalog so a definition never inherits capabilities
     * from another kiosk owned by the same module.
     */
    default Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        return capabilities();
    }

    Map<String, Object> bootstrap(KioskExecutionContext context);

    /** Whether this adapter exposes a workspace protected by an authenticated employee session. */
    default boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return false;
    }

    default Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        throw new UnsupportedOperationException("This kiosk does not expose an employee workspace.");
    }

    default KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        return KioskAuthorization.allow();
    }

    default KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        return KioskValidationResult.success();
    }

    Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request);

    default Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        throw new UnsupportedOperationException("This kiosk action is not available in the employee workspace.");
    }
}
