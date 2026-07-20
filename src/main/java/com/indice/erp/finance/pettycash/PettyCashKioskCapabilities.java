package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class PettyCashKioskCapabilities {

    public static final String OWNER_MODULE = "PETTY_CASH";
    public static final String KIOSK_TYPE = "receipt_capture";
    public static final String IDENTITY_VERIFY = "petty-cash.identity.verify";
    public static final String MOVEMENTS_READ = "petty-cash.movements.read";
    public static final String RECEIPT_CREATE = "petty-cash.receipt.create";
    public static final String RECEIPT_DELETE = "petty-cash.receipt.delete";
    public static final String ATTACHMENTS_READ = "petty-cash.attachments.read";
    public static final String ATTACHMENT_PRESIGN = "petty-cash.attachment.presign";
    public static final String ATTACHMENT_REGISTER = "petty-cash.attachment.register";

    private static final Map<String, Object> FILE_POLICY = Map.of(
        "mimeTypes", List.of(
            "application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv", "text/plain"),
        "extensions", List.of(
            ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".doc", ".docx",
            ".xls", ".xlsx", ".csv", ".txt"),
        "maxSizeBytes", 10L * 1024L * 1024L,
        "maxFiles", 5,
        "purpose", "petty-cash-receipt",
        "retentionOwner", OWNER_MODULE
    );

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(IDENTITY_VERIFY, KioskOperationPolicy.DIRECT, false),
        descriptor(MOVEMENTS_READ, KioskOperationPolicy.INFORMATION_ONLY, false),
        descriptor(RECEIPT_CREATE, KioskOperationPolicy.DIRECT, true),
        descriptor(RECEIPT_DELETE, KioskOperationPolicy.DIRECT, true),
        descriptor(ATTACHMENTS_READ, KioskOperationPolicy.INFORMATION_ONLY, false),
        fileDescriptor(ATTACHMENT_PRESIGN, true),
        fileDescriptor(ATTACHMENT_REGISTER, true)
    );

    private PettyCashKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    private static KioskCapabilityDescriptor descriptor(
            String key,
            KioskOperationPolicy policy,
            boolean mutation) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, policy, KioskAccessLevel.CONTROLLED, mutation, false);
    }

    private static KioskCapabilityDescriptor fileDescriptor(String key, boolean mutation) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            mutation, false, Map.of(), Map.of(), FILE_POLICY);
    }
}
