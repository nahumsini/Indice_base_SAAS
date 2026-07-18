package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskSessionService;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AttendanceKioskAdapter implements KioskModuleAdapter {

    private final HrAttendanceService attendance;
    private final AttendanceKioskEngineIdentityService identities;
    private final AttendanceKioskModuleAuditService moduleAudit;
    private final KioskSessionService sessions;

    public AttendanceKioskAdapter(
            HrAttendanceService attendance,
            AttendanceKioskEngineIdentityService identities,
            AttendanceKioskModuleAuditService moduleAudit,
            KioskSessionService sessions) {
        this.attendance = attendance;
        this.identities = identities;
        this.moduleAudit = moduleAudit;
        this.sessions = sessions;
    }

    @Override
    public String ownerModule() {
        return AttendanceKioskCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return AttendanceKioskCapabilities.descriptors();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return attendance.publicKioskBootstrap(context.accessReference());
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        if (context.definition() == null) {
            return KioskAuthorization.deny("Kiosk definition is not resolved.");
        }
        if (!AttendanceKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                && context.session() == null) {
            return KioskAuthorization.deny("Attendance kiosk authentication is required.");
        }
        if (context.session() != null && !"EMPLOYEE".equals(context.session().identityType())) {
            return KioskAuthorization.deny("Attendance kiosk requires an employee identity.");
        }
        return KioskAuthorization.allow();
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        var payload = request.payload();
        if (AttendanceKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())
                && blank(payload.get("credential_payload")) && blank(payload.get("pin"))) {
            return KioskValidationResult.invalid("credential_payload is required.");
        }
        if (AttendanceKioskCapabilities.PUNCH_CREATE.equals(request.capabilityKey())) {
            var eventType = String.valueOf(payload.getOrDefault("event_type", ""));
            if (!Set.of("check_in", "check_out").contains(eventType)) {
                return KioskValidationResult.invalid("event_type must be check_in or check_out.");
            }
        }
        if (Set.of(
                AttendanceKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN,
                AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE
            ).contains(request.capabilityKey())
                && (request.resourceId() == null || request.resourceId() <= 0)) {
            return KioskValidationResult.invalid("A valid face verification session is required.");
        }
        return KioskValidationResult.success();
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        requireContext(context);
        AttendanceKioskCapabilities.require(request.capabilityKey());
        var payload = legacySessionPayload(request.payload());
        var response = switch (request.capabilityKey()) {
            case AttendanceKioskCapabilities.IDENTITY_VERIFY ->
                attendance.publicKioskIdentify(context.accessReference(), payload);
            case AttendanceKioskCapabilities.PHOTO_PRESIGN ->
                attendance.createPublicKioskPhotoUpload(context.accessReference(), payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_BEGIN ->
                attendance.createPublicKioskFaceVerificationSession(context.accessReference(), payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN ->
                attendance.createPublicKioskFaceVerificationCaptureUpload(
                    context.accessReference(), request.resourceId(), payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE ->
                attendance.completePublicKioskFaceVerificationSession(
                    context.accessReference(), request.resourceId(), payload);
            case AttendanceKioskCapabilities.PUNCH_CREATE ->
                attendance.publicKioskPunch(context.accessReference(), payload);
            default -> throw new IllegalArgumentException("Unsupported attendance kiosk capability.");
        };
        afterExecute(context, request, response);
        return response;
    }

    private void afterExecute(
            KioskExecutionContext context,
            KioskActionRequest request,
            Map<String, Object> response) {
        if (AttendanceKioskCapabilities.IDENTITY_VERIFY.equals(request.capabilityKey())) {
            var identityId = nestedLong(response.get("user"), "id");
            if (context.definition() != null && identityId != null) {
                identities.synchronizePersonalPin(context.definition().companyId(), identityId);
            }
            return;
        }
        if (AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE.equals(request.capabilityKey())
                && Boolean.TRUE.equals(response.get("matched"))
                && Boolean.TRUE.equals(response.get("liveness_passed"))) {
            sessions.recordVerifiedFactor(context.session(), "FACE");
            moduleAudit.success(context, "ATTENDANCE_FACE_VERIFIED", "FACE_VERIFICATION_SESSION",
                request.resourceId(), Map.of("liveness_passed", true));
            return;
        }
        if (AttendanceKioskCapabilities.PUNCH_CREATE.equals(request.capabilityKey())) {
            moduleAudit.success(context, "ATTENDANCE_PUNCH_RECORDED", "ATTENDANCE_EVENT",
                number(response.get("event_id")), Map.of(
                    "event_kind", String.valueOf(response.getOrDefault("event_kind", "")),
                    "identity_evidence", String.valueOf(response.getOrDefault("identity_evidence", ""))
                ));
        }
    }

    private LinkedHashMap<String, Object> legacySessionPayload(Map<String, Object> source) {
        var payload = new LinkedHashMap<>(source == null ? Map.of() : source);
        if (blank(payload.get("identification_token")) && !blank(payload.get("kiosk_session_token"))) {
            payload.put("identification_token", payload.get("kiosk_session_token"));
        }
        if (blank(payload.get("credential_payload")) && !blank(payload.get("pin"))) {
            payload.put("credential_payload", payload.get("pin"));
        }
        return payload;
    }

    private Long nestedLong(Object value, String key) {
        return value instanceof Map<?, ?> map ? number(map.get(key)) : null;
    }

    private Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean blank(Object value) {
        return value == null || String.valueOf(value).isBlank();
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Human Resources.");
        }
    }
}
