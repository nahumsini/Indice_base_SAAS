package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

/** Employee-center bridge that keeps the attendance public token inside its owner module. */
@Service
public class AttendanceEmployeeKioskService {

    private final HrAttendanceService attendance;
    private final KioskRegistryService registry;
    private final AttendanceKioskDeviceRepository devices;

    public AttendanceEmployeeKioskService(
            HrAttendanceService attendance,
            KioskRegistryService registry,
            AttendanceKioskDeviceRepository devices) {
        this.attendance = attendance;
        this.registry = registry;
        this.devices = devices;
    }

    public boolean supports(KioskResolvedDefinition definition) {
        if (definition == null
                || !AttendanceKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
                || definition.legacyReferenceId() == null
                || definition.legacyReferenceId() <= 0) {
            return false;
        }
        try {
            var device = devices.get(definition.companyId(), definition.legacyReferenceId());
            if (!"active".equalsIgnoreCase(device.status())
                    || device.publicAccessToken() == null
                    || device.publicAccessToken().isBlank()) {
                return false;
            }
            if (registry.publicTokenRecoverable(definition.companyId(), definition.id())) {
                return true;
            }
            return registry.repairLegacyPublicTokenRecoveryMaterial(
                definition.companyId(), definition.id(), definition.ownerModule(),
                definition.kioskType(), definition.legacyReferenceId(),
                device.publicAccessToken());
        } catch (NoSuchElementException | IllegalArgumentException
                | IllegalStateException | SecurityException unavailable) {
            return false;
        }
    }

    public Map<String, Object> bootstrap(KioskResolvedDefinition definition, long userId) {
        requireSupported(definition);
        return attendance.employeeKioskBootstrap(
            recoverPublicToken(definition), definition.companyId(), userId);
    }

    public Map<String, Object> execute(
            KioskResolvedDefinition definition,
            long userId,
            KioskActionRequest request) {
        requireSupported(definition);
        AttendanceKioskCapabilities.require(request.capabilityKey());
        if (AttendanceKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())) {
            throw new IllegalArgumentException(
                "Attendance identity verification is already provided by the employee kiosk session.");
        }
        if (AttendanceKioskCapabilities.PUNCH_CREATE.equals(request.capabilityKey())) {
            requireEmployeePunchEvidence(request.payload());
        }

        var deviceToken = recoverPublicToken(definition);
        var payload = new LinkedHashMap<>(request.payload() == null ? Map.of() : request.payload());
        payload.remove("pin");
        payload.remove("credential_payload");
        payload.remove("credential");
        payload.put("identification_token", attendance.employeeKioskIdentificationToken(
            deviceToken, definition.companyId(), userId));

        return switch (request.capabilityKey()) {
            case AttendanceKioskCapabilities.PHOTO_PRESIGN ->
                attendance.createPublicKioskPhotoUpload(deviceToken, payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_BEGIN ->
                attendance.createPublicKioskFaceVerificationSession(deviceToken, payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN ->
                attendance.createPublicKioskFaceVerificationCaptureUpload(
                    deviceToken, requireResourceId(request), payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE ->
                attendance.completePublicKioskFaceVerificationSession(
                    deviceToken, requireResourceId(request), payload);
            case AttendanceKioskCapabilities.PUNCH_CREATE ->
                attendance.publicKioskPunch(deviceToken, payload);
            default -> throw new IllegalArgumentException(
                "Unsupported employee attendance capability: " + request.capabilityKey());
        };
    }

    private void requireSupported(KioskResolvedDefinition definition) {
        if (!supports(definition)) {
            throw new SecurityException("Attendance kiosk is not available in the employee center.");
        }
    }

    private String recoverPublicToken(KioskResolvedDefinition definition) {
        return registry.recoverPublicToken(
            definition.companyId(), definition.ownerModule(), definition.kioskType(),
            definition.legacyReferenceId());
    }

    private long requireResourceId(KioskActionRequest request) {
        if (request.resourceId() == null || request.resourceId() <= 0) {
            throw new IllegalArgumentException("A valid face verification session is required.");
        }
        return request.resourceId();
    }

    private void requireEmployeePunchEvidence(Map<String, Object> payload) {
        var source = payload == null ? Map.<String, Object>of() : payload;
        if (positiveLong(source.get("face_verification_session_id")) == null
                && blank(source.get("photo_url"))) {
            throw new IllegalArgumentException(
                "A verified face session or stored attendance photo is required.");
        }
    }

    private Long positiveLong(Object value) {
        if (value instanceof Number number) {
            var parsed = number.longValue();
            return parsed > 0 ? parsed : null;
        }
        try {
            var parsed = value == null ? 0L : Long.parseLong(String.valueOf(value).trim());
            return parsed > 0 ? parsed : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean blank(Object value) {
        return value == null || String.valueOf(value).isBlank();
    }
}
