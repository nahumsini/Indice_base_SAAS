package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class ProcurementSupplierPortalCapabilities {

    public static final String OWNER_MODULE = "PROCUREMENT";
    public static final String KIOSK_TYPE = "supplier_portal";
    public static final String PROVIDER_PROPOSALS_KIOSK_TYPE = "provider_proposals";
    public static final String PROVIDER_ORDERS_KIOSK_TYPE = "provider_orders_invoices";

    public static final String IDENTITY_VERIFY = "procurement.portal.identity.verify";
    public static final String CATALOG_READ = "procurement.catalog.read";
    public static final String SUBMISSION_CREATE = "procurement.submission.create";
    public static final String INVOICE_DOCUMENT_PRESIGN = "procurement.invoice.document.presign";
    public static final String INVOICE_DOCUMENT_REGISTER = "procurement.invoice.document.register";
    public static final String INVOICE_SUBMIT = "procurement.invoice.submit";
    public static final String PROVIDER_PROPOSALS_READ = "procurement.provider.proposals.read";
    public static final String PROVIDER_PROPOSAL_SUBMIT = "procurement.provider.proposal.submit";
    public static final String PROVIDER_QUOTE_RESPOND = "procurement.provider.quote.respond";
    public static final String PROVIDER_PROFILE_CHANGE_SUBMIT =
        "procurement.provider.profile-change.submit";
    public static final String PROVIDER_ORDERS_READ = "procurement.provider.orders.read";
    public static final String PROVIDER_ORDER_RESPOND = "procurement.provider.order.respond";
    public static final String PROVIDER_ORDER_INVOICE_SUBMIT =
        "procurement.provider.order-invoice.submit";

    private static final Map<String, Object> INVOICE_FILE_POLICY = Map.of(
        "mimeTypes", List.of(
            "application/pdf", "image/jpeg", "image/png", "image/webp",
            "text/xml", "application/xml",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "extensions", List.of(
            ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".xml", ".docx", ".xlsx"),
        "maxSizeBytes", 15L * 1024L * 1024L,
        "maxFiles", 3,
        "countAdopted", false,
        "requireConsumption", true,
        "consumptionGraceHours", 24,
        "sealOnRegister", true,
        "purpose", "supplier-invoice-document",
        "retentionOwner", OWNER_MODULE
    );

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        identityDescriptor(),
        descriptor(CATALOG_READ, KioskOperationPolicy.INFORMATION_ONLY, false),
        descriptor(SUBMISSION_CREATE, KioskOperationPolicy.REVIEW_REQUIRED, true),
        fileDescriptor(INVOICE_DOCUMENT_PRESIGN),
        fileDescriptor(INVOICE_DOCUMENT_REGISTER),
        descriptor(INVOICE_SUBMIT, KioskOperationPolicy.REVIEW_REQUIRED, true),
        descriptor(PROVIDER_PROPOSALS_READ, KioskOperationPolicy.INFORMATION_ONLY, false),
        descriptor(PROVIDER_PROPOSAL_SUBMIT, KioskOperationPolicy.REVIEW_REQUIRED, true),
        descriptor(PROVIDER_QUOTE_RESPOND, KioskOperationPolicy.REVIEW_REQUIRED, true),
        descriptor(PROVIDER_PROFILE_CHANGE_SUBMIT, KioskOperationPolicy.REVIEW_REQUIRED, true),
        descriptor(PROVIDER_ORDERS_READ, KioskOperationPolicy.INFORMATION_ONLY, false),
        descriptor(PROVIDER_ORDER_RESPOND, KioskOperationPolicy.REVIEW_REQUIRED, true),
        descriptor(PROVIDER_ORDER_INVOICE_SUBMIT, KioskOperationPolicy.REVIEW_REQUIRED, true)
    );

    private ProcurementSupplierPortalCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    public static Set<KioskCapabilityDescriptor> descriptorsFor(String kioskType) {
        var keys = switch (kioskType == null ? "" : kioskType) {
            case PROVIDER_PROPOSALS_KIOSK_TYPE -> Set.of(
                PROVIDER_PROPOSALS_READ, PROVIDER_PROPOSAL_SUBMIT, PROVIDER_QUOTE_RESPOND,
                PROVIDER_PROFILE_CHANGE_SUBMIT);
            case PROVIDER_ORDERS_KIOSK_TYPE -> Set.of(
                PROVIDER_ORDERS_READ, PROVIDER_ORDER_RESPOND,
                INVOICE_DOCUMENT_PRESIGN, INVOICE_DOCUMENT_REGISTER,
                PROVIDER_ORDER_INVOICE_SUBMIT);
            default -> Set.of(
                IDENTITY_VERIFY, CATALOG_READ, SUBMISSION_CREATE,
                INVOICE_DOCUMENT_PRESIGN, INVOICE_DOCUMENT_REGISTER, INVOICE_SUBMIT);
        };
        return DESCRIPTORS.stream().filter(item -> keys.contains(item.key()))
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public static Set<String> operationalKeys() {
        return Set.of(
            CATALOG_READ,
            SUBMISSION_CREATE,
            INVOICE_DOCUMENT_PRESIGN,
            INVOICE_DOCUMENT_REGISTER,
            INVOICE_SUBMIT
        );
    }

    private static KioskCapabilityDescriptor descriptor(
            String key,
            KioskOperationPolicy policy,
            boolean mutation) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, policy, KioskAccessLevel.CONTROLLED, mutation, true);
    }

    private static KioskCapabilityDescriptor fileDescriptor(String key) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT,
            KioskAccessLevel.CONTROLLED, true, true,
            Map.of(), Map.of(), INVOICE_FILE_POLICY);
    }

    private static KioskCapabilityDescriptor identityDescriptor() {
        return new KioskCapabilityDescriptor(
            IDENTITY_VERIFY, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT,
            KioskAccessLevel.CONTROLLED, false, true,
            Map.of("stablePinScope", "PERSON"), Map.of(), Map.of());
    }
}
