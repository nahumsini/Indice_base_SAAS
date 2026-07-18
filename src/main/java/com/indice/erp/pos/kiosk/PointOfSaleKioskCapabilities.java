package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Central versioned capability catalog for every POS-owned kiosk experience. */
public final class PointOfSaleKioskCapabilities {

    public static final String OWNER_MODULE = "POINT_OF_SALE";
    public static final String CUSTOMER_DISPLAY_TYPE = "customer_display";
    public static final String CUSTOMER_DISPLAY_PAIR = "pos.customer-display.pair";
    public static final String CUSTOMER_DISPLAY_STATE_READ = "pos.customer-display.state.read";
    public static final String SELF_SERVICE_TYPE = "self_service";
    public static final String SELF_SERVICE_CATALOG_READ = "pos.self-service.catalog.read";
    public static final String SELF_SERVICE_PRETICKET_CREATE = "pos.self-service.preticket.create";

    private static final Set<KioskCapabilityDescriptor> CUSTOMER_DISPLAY = Set.of(
        new KioskCapabilityDescriptor(
            CUSTOMER_DISPLAY_PAIR,
            1,
            OWNER_MODULE,
            KioskOperationPolicy.DIRECT,
            KioskAccessLevel.PUBLIC,
            true,
            true,
            Map.of(
                "type", "object",
                "required", java.util.List.of("pairing_code"),
                "properties", Map.of(
                    "pairing_code", Map.of("type", "string", "minLength", 6, "maxLength", 16),
                    "device_name", Map.of("type", "string", "maxLength", 160)
                )
            ),
            Map.of(
                "type", "object",
                "properties", Map.of(
                    "deviceToken", Map.of("type", "string"),
                    "displayUrl", Map.of("type", "string")
                )
            ),
            Map.of()
        ),
        new KioskCapabilityDescriptor(
            CUSTOMER_DISPLAY_STATE_READ,
            1,
            OWNER_MODULE,
            KioskOperationPolicy.INFORMATION_ONLY,
            KioskAccessLevel.PUBLIC,
            false,
            true,
            Map.of("type", "object"),
            Map.of(
                "type", "object",
                "description", "Customer-safe live POS ticket snapshot"
            ),
            Map.of()
        )
    );
    private static final Set<KioskCapabilityDescriptor> SELF_SERVICE = Set.of(
        new KioskCapabilityDescriptor(
            SELF_SERVICE_CATALOG_READ,
            1,
            OWNER_MODULE,
            KioskOperationPolicy.INFORMATION_ONLY,
            KioskAccessLevel.PUBLIC,
            false,
            false,
            Map.of("type", "object"),
            Map.of("type", "object", "description", "Location-scoped POS catalog"),
            Map.of()
        ),
        new KioskCapabilityDescriptor(
            SELF_SERVICE_PRETICKET_CREATE,
            1,
            OWNER_MODULE,
            KioskOperationPolicy.DIRECT,
            KioskAccessLevel.PUBLIC,
            true,
            true,
            Map.of(
                "type", "object",
                "required", java.util.List.of("items"),
                "properties", Map.of(
                    "customerName", Map.of("type", "string", "maxLength", 180),
                    "customerEmail", Map.of("type", "string", "maxLength", 180),
                    "customerPhone", Map.of("type", "string", "maxLength", 40),
                    "items", Map.of("type", "array", "minItems", 1, "maxItems", 100)
                )
            ),
            Map.of(
                "type", "object",
                "description", "Pending pre-ticket requiring cashier confirmation"
            ),
            Map.of()
        )
    );
    private static final Map<String, KioskCapabilityDescriptor> BY_KEY = index(CUSTOMER_DISPLAY);

    private PointOfSaleKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> customerDisplayDescriptors() {
        return CUSTOMER_DISPLAY;
    }

    public static KioskCapabilityDescriptor requireCustomerDisplay(String key) {
        var descriptor = BY_KEY.get(key);
        if (descriptor == null) {
            throw new IllegalArgumentException("Unsupported customer display capability: " + key);
        }
        return descriptor;
    }

    public static Set<KioskCapabilityDescriptor> selfServiceDescriptors() {
        return SELF_SERVICE;
    }

    private static Map<String, KioskCapabilityDescriptor> index(
            Set<KioskCapabilityDescriptor> descriptors) {
        var result = new LinkedHashMap<String, KioskCapabilityDescriptor>();
        descriptors.forEach(descriptor -> result.put(descriptor.key(), descriptor));
        return Map.copyOf(result);
    }
}
