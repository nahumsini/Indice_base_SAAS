package com.indice.erp.sales.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Capabilities owned by Sales for the authenticated employee route-sales workspace. */
public final class RouteSalesKioskCapabilities {

    public static final String OWNER_MODULE = "SALES";
    public static final String WORKSPACE_READ = "sales.route.workspace.read";
    public static final String CONTACT_CREATE = "sales.route.contact.create";
    public static final String SALE_CREATE = "sales.route.sale.create";
    public static final String PAYMENT_EVIDENCE_PRESIGN = "sales.route.payment-evidence.presign";
    public static final String PAYMENT_EVIDENCE_REGISTER = "sales.route.payment-evidence.register";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(
            WORKSPACE_READ,
            KioskOperationPolicy.INFORMATION_ONLY,
            false,
            false,
            Map.of("type", "object"),
            Map.of("type", "object", "description", "Seller-owned route-sales workspace")),
        descriptor(
            CONTACT_CREATE,
            KioskOperationPolicy.DIRECT,
            true,
            true,
            Map.of(
                "type", "object",
                "required", List.of("companyName"),
                "properties", Map.of(
                    "companyName", Map.of("type", "string", "maxLength", 180),
                    "contactPerson", Map.of("type", "string", "maxLength", 180),
                    "phone", Map.of("type", "string", "maxLength", 40),
                    "email", Map.of("type", "string", "format", "email", "maxLength", 240),
                    "fiscal", fiscalInputSchema())),
            Map.of("type", "object", "description", "Seller-owned customer")),
        descriptor(
            SALE_CREATE,
            KioskOperationPolicy.DIRECT,
            true,
            true,
            Map.of(
                "type", "object",
                "required", List.of("contactId", "warehouseId", "paymentMethod", "items"),
                "properties", Map.of(
                    "contactId", Map.of("type", "integer", "minimum", 1),
                    "warehouseId", Map.of("type", "integer", "minimum", 1),
                    "paymentMethod", Map.of("enum", List.of("cash", "card", "transfer", "credit")),
                    "paymentAccountId", Map.of("type", "integer", "minimum", 1),
                    "items", Map.of("type", "array", "minItems", 1, "maxItems", 100))),
            Map.of("type", "object", "description", "Authoritative completed route sale")),
        descriptor(
            PAYMENT_EVIDENCE_PRESIGN,
            KioskOperationPolicy.DIRECT,
            true,
            true,
            Map.of(
                "type", "object",
                "required", List.of("saleId", "fileName", "contentType", "sizeBytes"),
                "properties", Map.of(
                    "saleId", Map.of("type", "integer", "minimum", 1),
                    "fileName", Map.of("type", "string", "maxLength", 255),
                    "contentType", Map.of("enum", List.of(
                        "application/pdf", "image/jpeg", "image/png", "image/webp")),
                    "sizeBytes", Map.of("type", "integer", "minimum", 1, "maximum", 15728640))),
            Map.of("type", "object", "description", "Short-lived upload for seller-owned sale")),
        descriptor(
            PAYMENT_EVIDENCE_REGISTER,
            KioskOperationPolicy.DIRECT,
            true,
            true,
            Map.of(
                "type", "object",
                "required", List.of("saleId", "objectKey", "fileName", "contentType", "sizeBytes"),
                "properties", Map.of(
                    "saleId", Map.of("type", "integer", "minimum", 1),
                    "objectKey", Map.of("type", "string", "maxLength", 1200),
                    "fileName", Map.of("type", "string", "maxLength", 255),
                    "contentType", Map.of("enum", List.of(
                        "application/pdf", "image/jpeg", "image/png", "image/webp")),
                    "sizeBytes", Map.of("type", "integer", "minimum", 1, "maximum", 15728640))),
            Map.of("type", "object", "description", "Adopted payment evidence for seller-owned sale"))
    );

    private static final Map<String, KioskCapabilityDescriptor> BY_KEY = indexDescriptors();

    private RouteSalesKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    public static KioskCapabilityDescriptor require(String key) {
        var descriptor = BY_KEY.get(key);
        if (descriptor == null) {
            throw new IllegalArgumentException("Unsupported route-sales kiosk capability: " + key);
        }
        return descriptor;
    }

    private static KioskCapabilityDescriptor descriptor(
            String key,
            KioskOperationPolicy policy,
            boolean mutation,
            boolean sensitive,
            Map<String, Object> input,
            Map<String, Object> result) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, policy, KioskAccessLevel.CONTROLLED,
            mutation, sensitive, input, result, Map.of());
    }

    private static Map<String, Object> fiscalInputSchema() {
        return Map.of(
            "type", "object",
            "properties", Map.ofEntries(
                Map.entry("country", Map.of("type", "string", "pattern", "^[A-Za-z]{2}$")),
                Map.entry("legalName", Map.of("type", "string", "maxLength", 220)),
                Map.entry("taxId", Map.of("type", "string", "maxLength", 120)),
                Map.entry("registryId", Map.of("type", "string", "maxLength", 140)),
                Map.entry("addressLine1", Map.of("type", "string", "maxLength", 240)),
                Map.entry("addressLine2", Map.of("type", "string", "maxLength", 240)),
                Map.entry("city", Map.of("type", "string", "maxLength", 120)),
                Map.entry("state", Map.of("type", "string", "maxLength", 120)),
                Map.entry("postalCode", Map.of("type", "string", "maxLength", 40)),
                Map.entry("email", Map.of("type", "string", "format", "email", "maxLength", 220)),
                Map.entry("regime", Map.of("type", "string", "maxLength", 180)),
                Map.entry("cfdiUse", Map.of("type", "string", "maxLength", 32)),
                Map.entry("notes", Map.of("type", "string", "maxLength", 2000))));
    }

    private static Map<String, KioskCapabilityDescriptor> indexDescriptors() {
        var descriptors = new LinkedHashMap<String, KioskCapabilityDescriptor>();
        DESCRIPTORS.forEach(descriptor -> descriptors.put(descriptor.key(), descriptor));
        return Map.copyOf(descriptors);
    }
}
