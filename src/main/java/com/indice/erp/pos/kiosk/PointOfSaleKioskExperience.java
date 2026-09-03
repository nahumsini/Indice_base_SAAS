package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.Map;
import java.util.Set;

/** One typed kiosk experience owned by the shared Point of Sale adapter. */
public interface PointOfSaleKioskExperience {

    String kioskType();

    default Set<String> kioskTypes() {
        return Set.of(kioskType());
    }

    Set<KioskCapabilityDescriptor> capabilities();

    Map<String, Object> bootstrap(KioskExecutionContext context);

    default boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return false;
    }

    default Set<String> employeeCenterTabPermissionKeys(KioskResolvedDefinition definition) {
        return Set.of();
    }

    default Set<String> employeeCapabilityTabPermissionKeys(
            KioskResolvedDefinition definition,
            KioskCapabilityDescriptor capability) {
        return employeeCenterTabPermissionKeys(definition);
    }

    default Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        throw new UnsupportedOperationException("This POS kiosk does not expose an employee workspace.");
    }

    default KioskAuthorization authorizeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        return authorize(context, request);
    }

    default KioskValidationResult validateEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        return validate(context, request);
    }

    default Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        throw new UnsupportedOperationException("This POS kiosk action is not available to employees.");
    }

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
