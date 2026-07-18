package com.indice.erp.pos.customerdisplay;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import com.indice.erp.pos.customerdisplay.dto.CustomerDisplayPairRequest;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import com.indice.erp.pos.kiosk.PointOfSaleKioskExperience;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Typed module bridge for the customer-safe POS display use cases. */
@Component
public class CustomerDisplayKioskExperience implements PointOfSaleKioskExperience {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final CustomerDisplayService service;
    private final ObjectMapper objectMapper;

    public CustomerDisplayKioskExperience(CustomerDisplayService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @Override
    public String kioskType() {
        return PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_TYPE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return PointOfSaleKioskCapabilities.customerDisplayDescriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return service.publicBootstrap(context.accessReference());
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_PAIR.equals(request.capabilityKey())) {
            var pairingCode = text(request.payload(), "pairing_code", "pairingCode");
            if (!service.pairingCodeBelongsToDefinition(
                    pairingCode, context.definition().legacyReferenceId())) {
                return KioskAuthorization.deny("Pairing code expired or not found.");
            }
        }
        return KioskAuthorization.allow();
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        PointOfSaleKioskCapabilities.requireCustomerDisplay(request.capabilityKey());
        if (PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_PAIR.equals(request.capabilityKey())) {
            var pairingCode = text(request.payload(), "pairing_code", "pairingCode");
            if (pairingCode == null || pairingCode.length() < 6 || pairingCode.length() > 16) {
                return KioskValidationResult.invalid("A valid pairing code is required.");
            }
            var name = text(request.payload(), "device_name", "deviceName");
            if (name != null && name.length() > 160) {
                return KioskValidationResult.invalid("Device name must not exceed 160 characters.");
            }
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        PointOfSaleKioskCapabilities.requireCustomerDisplay(request.capabilityKey());
        var result = switch (request.capabilityKey()) {
            case PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_PAIR -> service.pair(
                new CustomerDisplayPairRequest(
                    text(request.payload(), "pairing_code", "pairingCode"),
                    text(request.payload(), "device_name", "deviceName")
                )
            );
            case PointOfSaleKioskCapabilities.CUSTOMER_DISPLAY_STATE_READ ->
                service.publicState(context.accessReference());
            default -> throw new IllegalArgumentException("Unsupported customer display capability.");
        };
        return objectMapper.convertValue(result, MAP_TYPE);
    }

    private void requireContext(KioskExecutionContext context) {
        if (!PointOfSaleKioskCapabilities.OWNER_MODULE.equals(context.ownerModule())
                || context.definition() == null
                || !kioskType().equals(context.definition().kioskType())) {
            throw new IllegalArgumentException("Customer display kiosk context is required.");
        }
    }

    private String text(Map<String, Object> payload, String snakeCase, String camelCase) {
        if (payload == null) {
            return null;
        }
        var value = payload.containsKey(snakeCase) ? payload.get(snakeCase) : payload.get(camelCase);
        var normalized = value == null ? null : String.valueOf(value).trim();
        return normalized == null || normalized.isBlank() ? null : normalized;
    }
}
