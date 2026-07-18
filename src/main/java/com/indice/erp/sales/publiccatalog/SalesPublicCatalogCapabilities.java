package com.indice.erp.sales.publiccatalog;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class SalesPublicCatalogCapabilities {

    public static final String CATALOG_READ = "sales.catalog.read";
    public static final String REQUEST_CREATE = "sales.catalog.request.create";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        new KioskCapabilityDescriptor(
            CATALOG_READ, 1, SalesPublicCatalogService.OWNER_MODULE,
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.PUBLIC,
            false, false,
            Map.of("type", "object"),
            Map.of("type", "object", "description", "Configured public sales catalog"),
            Map.of()),
        new KioskCapabilityDescriptor(
            REQUEST_CREATE, 1, SalesPublicCatalogService.OWNER_MODULE,
            KioskOperationPolicy.REVIEW_REQUIRED, KioskAccessLevel.PUBLIC,
            true, true,
            Map.of(
                "type", "object",
                "required", List.of("customerName", "contact", "preferredContactMethod", "items"),
                "properties", Map.of(
                    "customerName", Map.of("type", "string", "maxLength", 180),
                    "contact", Map.of("type", "string", "maxLength", 240),
                    "preferredContactMethod", Map.of("enum", List.of("whatsapp", "email", "phone", "website")),
                    "message", Map.of("type", "string", "maxLength", 4000),
                    "items", Map.of("type", "array", "maxItems", 500))),
            Map.of(
                "type", "object",
                "description", "Minimal acknowledgement for a reviewable commercial request",
                "required", List.of("reference", "status", "submissionPolicy", "itemCount"),
                "properties", Map.of(
                    "reference", Map.of("type", "string"),
                    "requestNumber", Map.of("type", "string"),
                    "status", Map.of("type", "string"),
                    "submissionPolicy", Map.of("const", "REVIEW_REQUIRED"),
                    "currencyCode", Map.of("type", "string"),
                    "itemCount", Map.of("type", "integer"),
                    "estimatedTotal", Map.of("type", List.of("number", "null")))),
            Map.of())
    );

    private SalesPublicCatalogCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }
}
