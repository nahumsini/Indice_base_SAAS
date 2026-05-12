package com.indice.erp.hr.attendance.usecases.kiosk;

import com.indice.erp.hr.attendance.usecases.photo.HrAttendancePhotoUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.validateScheduleRegistrationPolicy;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseDecimalRequired;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendancePublicKioskPunchUseCases extends HrAttendancePhotoUseCases {

    protected HrAttendancePublicKioskPunchUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> publicKioskPunch(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var kioskDevice = attendanceKioskDeviceRepository.getByPublicAccessToken(deviceToken);
        var identificationToken = stringValue(payload, "identification_token");
        if (identificationToken.isBlank()) {
            throw new IllegalArgumentException("identification_token is required.");
        }

        var tokenClaims = attendanceKioskTokenService.verifyIdentificationToken(deviceToken, identificationToken);
        var user = attendanceUserLookupService.loadAttendanceUser(kioskDevice.companyId(), tokenClaims.userCompanyId());
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }
        validatePublicKioskScope(kioskDevice, user);

        var eventType = normalizePublicKioskEventType(stringValue(payload, "event_type", "event_kind"));
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }
        validateOperationalEventDate(eventType, eventTimestamp);

        var latitude = parseDecimalRequired(payload, "latitude");
        var longitude = parseDecimalRequired(payload, "longitude");
        var faceVerificationSessionId = normalizeOptionalForeignKey(parseLong(payload, "face_verification_session_id"));
        var photoObjectKey = attendancePhotoService.normalizeAttendancePhotoObjectKey(kioskDevice.companyId(), user.id(), stringValue(payload, "photo_url"));
        var hasFaceVerification = faceVerificationSessionId != null;
        var hasFallbackPhoto = photoObjectKey != null && !photoObjectKey.isBlank();

        if (!hasFaceVerification && !hasFallbackPhoto) {
            throw new IllegalArgumentException("Face verification or fallback photo is required.");
        }
        if (hasFaceVerification) {
            hrFaceService.consumeSuccessfulVerificationSession(kioskDevice.companyId(), user.id(), faceVerificationSessionId);
        }

        var attendanceDate = resolveOperationalAttendanceDate(kioskDevice.companyId(), user.id(), eventTimestamp, eventType);
        var scheduleRule = loadScheduleRule(kioskDevice.companyId(), user.id(), attendanceDate);
        var activeWorkSite = loadActiveWorkSiteAssignment(kioskDevice.companyId(), user.id(), attendanceDate);
        var location = resolveScheduleRegistrationLocation(
            kioskDevice.companyId(),
            user,
            scheduleRule,
            eventType,
            publicKioskRequestedLocationId(kioskDevice),
            latitude,
            longitude,
            activeWorkSite
        );
        validateScheduleRegistrationPolicy(scheduleRule, eventType, eventTimestamp, attendanceDate);
        validateOperationalEventTransition(kioskDevice.companyId(), user.id(), attendanceDate, eventTimestamp, eventType);

        var metadataJson = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "public_kiosk", true,
                "identified_user_company_id", user.id(),
                "pin_verified", true,
                "identity_evidence", hasFaceVerification ? "face_verified" : "photo_fallback",
                "requires_review", !hasFaceVerification
            )
        );
        var operationalEventId = appendAttendanceEvent(
            kioskDevice.companyId(),
            user.id(),
            eventType,
            eventTimestamp,
            attendanceDate,
            location.id(),
            kioskDevice.id(),
            latitude,
            longitude,
            photoObjectKey,
            "kiosk_public",
            tokenClaims.authMethod(),
            "success",
            eventType,
            metadataJson,
            null,
            null,
            0L
        );

        var dailyRecord = rebuildDailyRecordProjection(kioskDevice.companyId(), user.id(), attendanceDate);
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("user_company_id", user.id());
        result.put("event_kind", eventType);
        result.put("auth_method", tokenClaims.authMethod());
        result.put("result_status", "success");
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
        result.put("photo_object_key", photoObjectKey);
        result.put("identity_evidence", hasFaceVerification ? "face_verified" : "photo_fallback");
        result.put("today_activity", toPublicKioskDayActivity(attendanceDate, dailyRecord, scheduleRule));
        return result;
    }

    public Map<String, Object> createPublicKioskPhotoUpload(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        var normalizedPayload = new LinkedHashMap<String, Object>(payload);
        normalizedPayload.put("user_company_id", context.user().id());
        return createPhotoUpload(context.kioskDevice().companyId(), normalizedPayload);
    }

    public Map<String, Object> createPublicKioskFaceVerificationSession(String deviceToken, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        return hrFaceService.createVerificationSession(
            context.kioskDevice().companyId(),
            0L,
            Map.of("user_company_id", context.user().id())
        );
    }

    public Map<String, Object> createPublicKioskFaceVerificationCaptureUpload(
        String deviceToken,
        long sessionId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        ensureFaceVerificationSessionBelongsTo(context.kioskDevice().companyId(), context.user().id(), sessionId);
        return hrFaceService.createVerificationCaptureUpload(context.kioskDevice().companyId(), sessionId, payload);
    }

    public Map<String, Object> completePublicKioskFaceVerificationSession(
        String deviceToken,
        long sessionId,
        Map<String, Object> payload
    ) {
        payload = normalizePayload(payload);
        var context = requirePublicKioskIdentificationContext(deviceToken, payload);
        ensureFaceVerificationSessionBelongsTo(context.kioskDevice().companyId(), context.user().id(), sessionId);
        return hrFaceService.completeVerificationSession(context.kioskDevice().companyId(), 0L, sessionId);
    }
}
