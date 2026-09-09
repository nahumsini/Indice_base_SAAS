package com.indice.erp.finance.payablekiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class PayableKioskCapabilities {

    public static final String OWNER_MODULE = "EXPENSES";
    public static final String KIOSK_TYPE = "accounts_payable";
    public static final String PROVIDER_CENTER_KIOSK_TYPE = "provider_payables";
    public static final String IDENTITY_VERIFY = "payables.identity.verify";
    public static final String PROVIDER_REGISTER = "providers.registration.submit";
    public static final String PAYABLE_CREATE = "payables.submission.create";
    public static final String ATTACHMENT_PRESIGN = "payables.attachment.presign";
    public static final String ATTACHMENT_REGISTER = "payables.attachment.register";
    public static final String FACE_ENROLLMENT_STATUS = "payables.face.enrollment.status";
    public static final String FACE_ENROLLMENT_BEGIN = "payables.face.enrollment.begin";
    public static final String FACE_ENROLLMENT_CAPTURE_PRESIGN = "payables.face.enrollment.capture.presign";
    public static final String FACE_ENROLLMENT_COMPLETE = "payables.face.enrollment.complete";
    public static final String FACE_CONSENT_WITHDRAW = "payables.face.consent.withdraw";
    public static final String FACE_VERIFICATION_BEGIN = "payables.face.verification.begin";
    public static final String FACE_VERIFICATION_CAPTURE_PRESIGN = "payables.face.verification.capture.presign";
    public static final String FACE_VERIFICATION_COMPLETE = "payables.face.verification.complete";
    public static final String PROVIDER_CENTER_READ = "payables.provider-center.read";
    public static final String PROFILE_READ = "providers.profile.read";
    public static final String PROFILE_CHANGE_SUBMIT = "providers.profile-change.submit";

    private static final Map<String, Object> FILE_POLICY = Map.of(
        "mimeTypes", List.of(
            "application/pdf", "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
            "text/xml", "application/xml", "text/csv", "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        "extensions", List.of(
            ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".xml", ".csv", ".txt",
            ".doc", ".docx", ".xls", ".xlsx"),
        "maxSizeBytes", 10L * 1024L * 1024L,
        "maxFiles", 5,
        "purpose", "payable-evidence",
        "retentionOwner", OWNER_MODULE
    );

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(IDENTITY_VERIFY, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, false, true),
        descriptor(PROVIDER_REGISTER, KioskOperationPolicy.REVIEW_REQUIRED, KioskAccessLevel.PUBLIC, true, true),
        descriptor(PAYABLE_CREATE, KioskOperationPolicy.REVIEW_REQUIRED, KioskAccessLevel.CONTROLLED, true, true),
        fileDescriptor(ATTACHMENT_PRESIGN, true),
        fileDescriptor(ATTACHMENT_REGISTER, true),
        descriptor(FACE_ENROLLMENT_STATUS, KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED, false, true),
        descriptor(FACE_ENROLLMENT_BEGIN, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_ENROLLMENT_CAPTURE_PRESIGN, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_ENROLLMENT_COMPLETE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_CONSENT_WITHDRAW, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_VERIFICATION_BEGIN, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_VERIFICATION_CAPTURE_PRESIGN, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(FACE_VERIFICATION_COMPLETE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true),
        descriptor(PROVIDER_CENTER_READ, KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED, false, true),
        descriptor(PROFILE_READ, KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED, false, true),
        descriptor(PROFILE_CHANGE_SUBMIT, KioskOperationPolicy.REVIEW_REQUIRED, KioskAccessLevel.CONTROLLED, true, true)
    );

    private PayableKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    public static Set<KioskCapabilityDescriptor> descriptorsFor(String kioskType) {
        if (PROVIDER_CENTER_KIOSK_TYPE.equals(kioskType)) {
            var keys = Set.of(
                PROVIDER_CENTER_READ, PAYABLE_CREATE, ATTACHMENT_PRESIGN,
                ATTACHMENT_REGISTER, PROFILE_READ, PROFILE_CHANGE_SUBMIT);
            return DESCRIPTORS.stream().filter(item -> keys.contains(item.key()))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        }
        return DESCRIPTORS.stream()
            .filter(item -> !Set.of(PROVIDER_CENTER_READ, PROFILE_READ, PROFILE_CHANGE_SUBMIT)
                .contains(item.key()))
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private static KioskCapabilityDescriptor descriptor(
            String key,
            KioskOperationPolicy policy,
            KioskAccessLevel accessLevel,
            boolean mutation,
            boolean sensitive) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, policy, accessLevel, mutation, sensitive);
    }

    private static KioskCapabilityDescriptor fileDescriptor(String key, boolean mutation) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            mutation, true, Map.of(), Map.of(), FILE_POLICY);
    }
}
