package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** Versioned public contract for the Human Resources attendance kiosk. */
public final class AttendanceKioskCapabilities {

    public static final String OWNER_MODULE = "HUMAN_RESOURCES";
    public static final String IDENTITY_VERIFY = "attendance.identity.verify";
    public static final String PHOTO_PRESIGN = "attendance.photo.presign";
    public static final String FACE_VERIFICATION_BEGIN = "attendance.face.verification.begin";
    public static final String FACE_VERIFICATION_CAPTURE_PRESIGN =
        "attendance.face.verification.capture.presign";
    public static final String FACE_VERIFICATION_COMPLETE = "attendance.face.verification.complete";
    public static final String PUNCH_CREATE = "attendance.punch.create";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(IDENTITY_VERIFY, false, true),
        descriptor(PHOTO_PRESIGN, true, true),
        descriptor(FACE_VERIFICATION_BEGIN, true, true),
        descriptor(FACE_VERIFICATION_CAPTURE_PRESIGN, true, true),
        descriptor(FACE_VERIFICATION_COMPLETE, true, true),
        descriptor(PUNCH_CREATE, true, true)
    );
    private static final Map<String, KioskCapabilityDescriptor> BY_KEY = index();

    private AttendanceKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    public static KioskCapabilityDescriptor require(String key) {
        var descriptor = BY_KEY.get(key);
        if (descriptor == null) {
            throw new IllegalArgumentException("Unsupported attendance kiosk capability: " + key);
        }
        return descriptor;
    }

    private static KioskCapabilityDescriptor descriptor(String key, boolean mutation, boolean sensitive) {
        return new KioskCapabilityDescriptor(
            key, 1, OWNER_MODULE, KioskOperationPolicy.DIRECT,
            KioskAccessLevel.CONTROLLED, mutation, sensitive,
            IDENTITY_VERIFY.equals(key)
                ? Map.of("moduleManagedPinThrottle", true)
                : Map.of(),
            Map.of(),
            Map.of()
        );
    }

    private static Map<String, KioskCapabilityDescriptor> index() {
        var result = new LinkedHashMap<String, KioskCapabilityDescriptor>();
        DESCRIPTORS.forEach(descriptor -> result.put(descriptor.key(), descriptor));
        return Map.copyOf(result);
    }
}
