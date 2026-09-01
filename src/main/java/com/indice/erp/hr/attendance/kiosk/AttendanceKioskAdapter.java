package com.indice.erp.hr.attendance.kiosk;

import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionService;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class AttendanceKioskAdapter implements KioskModuleAdapter {

    private static final Set<String> EMPLOYEE_TAB_PERMISSIONS = Set.of(
        "human_resources.attendance", "human_resources.control");

    private final HrAttendanceService attendance;
    private final AttendanceKioskEngineIdentityService identities;
    private final AttendanceKioskModuleAuditService moduleAudit;
    private final KioskSessionService sessions;
    private final AttendanceEmployeeKioskService employeeCenter;

    public AttendanceKioskAdapter(
            HrAttendanceService attendance,
            AttendanceKioskEngineIdentityService identities,
            AttendanceKioskModuleAuditService moduleAudit,
            KioskSessionService sessions,
            AttendanceEmployeeKioskService employeeCenter) {
        this.attendance = attendance;
        this.identities = identities;
        this.moduleAudit = moduleAudit;
        this.sessions = sessions;
        this.employeeCenter = employeeCenter;
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
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        if (!isNativeAttendanceTool(definition)) {
            return capabilities();
        }
        return capabilities().stream()
            .filter(capability -> Set.of(
                AttendanceKioskCapabilities.PHOTO_PRESIGN,
                AttendanceKioskCapabilities.PUNCH_CREATE
            ).contains(capability.key()))
            .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        requireContext(context);
        return attendance.publicKioskBootstrap(context.accessReference());
    }

    @Override
    public boolean supportsEmployeeCenter(KioskResolvedDefinition definition) {
        return isNativeAttendanceTool(definition) || employeeCenter.supports(definition);
    }

    @Override
    public Set<String> employeeCenterTabPermissionKeys(KioskResolvedDefinition definition) {
        return EMPLOYEE_TAB_PERMISSIONS;
    }

    @Override
    public Set<String> employeeCapabilityTabPermissionKeys(
            KioskResolvedDefinition definition,
            KioskCapabilityDescriptor capability) {
        return AttendanceKioskCapabilities.IDENTITY_VERIFY.equals(capability.key())
            ? Set.of()
            : EMPLOYEE_TAB_PERMISSIONS;
    }

    @Override
    public Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
        requireEmployeeContext(context);
        if (isNativeAttendanceTool(context.definition())) {
            var dashboard = attendance.selfDashboard(
                context.definition().companyId(), context.session().identityId(), LocalDate.now());
            var result = nativeToolWorkspace(context.definition(), dashboard);
            result.put("authentication", "ENGINE_PIN_SESSION");
            result.put("tool_key", KioskEmployeeToolCatalogService.ATTENDANCE_TOOL_KEY);
            result.put("identity_evidence_required", true);
            return java.util.Collections.unmodifiableMap(result);
        }
        return employeeCenter.bootstrap(context.definition(), context.session().identityId());
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
        if (context.session() != null && !validIdentityForChannel(context)) {
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
        return executeWithAccessReference(context, request, context.accessReference(), payload);
    }

    @Override
    public Map<String, Object> executeEmployee(
            KioskExecutionContext context,
            KioskActionRequest request) {
        requireEmployeeContext(context);
        if (isNativeAttendanceTool(context.definition())) {
            AttendanceKioskCapabilities.require(request.capabilityKey());
            var response = switch (request.capabilityKey()) {
                case AttendanceKioskCapabilities.PHOTO_PRESIGN ->
                    attendance.createSelfPhotoUpload(
                        context.definition().companyId(), context.session().identityId(), request.payload());
                case AttendanceKioskCapabilities.PUNCH_CREATE -> {
                    requireNativeToolPhotoEvidence(request.payload());
                    var recorded = new LinkedHashMap<>(attendance.recordSelfKioskEvent(
                        context.definition().companyId(), context.session().identityId(), request.payload()));
                    var refreshed = attendance.selfDashboard(
                        context.definition().companyId(), context.session().identityId(), LocalDate.now());
                    recorded.put("today_activity", nativeTodayActivity(refreshed));
                    yield recorded;
                }
                default -> throw new SecurityException(
                    "Attendance capability is not available for this employee tool.");
            };
            afterExecute(context, request, response);
            return response;
        }
        var response = employeeCenter.execute(
            context.definition(), context.session().identityId(), request);
        afterExecute(context, request, response);
        return response;
    }

    private Map<String, Object> executeWithAccessReference(
            KioskExecutionContext context,
            KioskActionRequest request,
            String accessReference,
            Map<String, Object> payload) {
        var response = switch (request.capabilityKey()) {
            case AttendanceKioskCapabilities.IDENTITY_VERIFY ->
                attendance.publicKioskIdentify(accessReference, payload);
            case AttendanceKioskCapabilities.PHOTO_PRESIGN ->
                attendance.createPublicKioskPhotoUpload(accessReference, payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_BEGIN ->
                attendance.createPublicKioskFaceVerificationSession(accessReference, payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_CAPTURE_PRESIGN ->
                attendance.createPublicKioskFaceVerificationCaptureUpload(
                    accessReference, request.resourceId(), payload);
            case AttendanceKioskCapabilities.FACE_VERIFICATION_COMPLETE ->
                attendance.completePublicKioskFaceVerificationSession(
                    accessReference, request.resourceId(), payload);
            case AttendanceKioskCapabilities.PUNCH_CREATE ->
                attendance.publicKioskPunch(accessReference, payload);
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

    private boolean isNativeAttendanceTool(KioskResolvedDefinition definition) {
        return definition != null
            && AttendanceKioskCapabilities.OWNER_MODULE.equals(definition.ownerModule())
            && KioskEmployeeToolCatalogService.ATTENDANCE_KIOSK_TYPE.equals(definition.kioskType())
            && KioskEmployeeToolCatalogService.ATTENDANCE_RESERVED_CODE.equals(definition.code())
            && definition.legacyReferenceId() == null;
    }

    private void requireNativeToolPhotoEvidence(Map<String, Object> payload) {
        if (payload == null || blank(payload.get("photo_url"))) {
            throw new IllegalArgumentException(
                "A stored attendance photo is required for an employee tool punch.");
        }
    }

    private LinkedHashMap<String, Object> nativeToolWorkspace(
            KioskResolvedDefinition definition,
            Map<String, Object> dashboard) {
        var result = new LinkedHashMap<String, Object>();
        result.put("kiosk_device", Map.of(
            "id", definition.id(),
            "code", definition.code(),
            "name", definition.name()));
        result.put("kiosk_type", definition.kioskType());
        result.put("scope_label", "Asistencia de la compañía");
        result.put("inactivity_timeout_seconds", 1_800);
        result.put("user", firstMap(dashboard.get("users")));
        result.put("today_activity", nativeTodayActivity(dashboard));
        result.put("locations", dashboard.getOrDefault("locations", java.util.List.of()));
        result.put("summary", dashboard.getOrDefault("summary", Map.of()));
        return result;
    }

    private Map<String, Object> nativeTodayActivity(Map<String, Object> dashboard) {
        var source = firstMap(dashboard.get("items"));
        var activity = new LinkedHashMap<String, Object>();
        activity.put("attendance_date", dashboard.getOrDefault(
            "date", source.getOrDefault("attendance_date", LocalDate.now().toString())));
        for (var key : java.util.List.of(
                "status", "corrected_status", "first_check_in_at", "last_check_out_at",
                "first_location", "last_location", "minutes_late")) {
            activity.put(key, source.get(key));
        }
        activity.put("has_check_in", source.get("first_check_in_at") != null);
        activity.put("has_check_out", source.get("last_check_out_at") != null);
        activity.put("has_active_check_in",
            source.get("first_check_in_at") != null && source.get("last_check_out_at") == null);
        return java.util.Collections.unmodifiableMap(activity);
    }

    private Map<String, Object> firstMap(Object value) {
        if (value instanceof java.util.List<?> values && !values.isEmpty()
                && values.getFirst() instanceof Map<?, ?> raw) {
            var result = new LinkedHashMap<String, Object>();
            raw.forEach((key, item) -> result.put(String.valueOf(key), item));
            return java.util.Collections.unmodifiableMap(result);
        }
        return Map.of();
    }

    private void requireEmployeeContext(KioskExecutionContext context) {
        requireContext(context);
        if (!KioskExecutionChannels.isEmployeeChannel(context.channel())
                || context.definition() == null || context.session() == null
                || !"USER".equals(context.session().identityType())
                || context.session().identityId() <= 0
                || context.session().companyId() != context.definition().companyId()
                || context.session().kioskDefinitionId() != context.definition().id()) {
            throw new SecurityException("Authenticated employee attendance session is required.");
        }
    }

    private boolean validIdentityForChannel(KioskExecutionContext context) {
        return KioskExecutionChannels.isEmployeeChannel(context.channel())
            ? "USER".equals(context.session().identityType())
            : "EMPLOYEE".equals(context.session().identityType());
    }

    private void requireContext(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule())) {
            throw new IllegalArgumentException("Kiosk context does not belong to Human Resources.");
        }
    }
}
