package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.usecases.schedule.HrAttendanceScheduleAssignmentUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.validateScheduleRegistrationPolicy;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseDecimalRequired;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceAdminKioskEventUseCases extends HrAttendanceScheduleAssignmentUseCases {

    protected HrAttendanceAdminKioskEventUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> recordKioskEvent(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("user_company_id is required.");
        }

        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }

        var eventKind = normalizeEventKind(stringValue(payload, "event_kind", "event_type", "registro_tipo"));
        var eventType = normalizeEventTypeForStorage(eventKind);
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }
        validateOperationalEventDate(eventKind, eventTimestamp);
        var accessProfile = attendanceAccessService.loadOrCreateAccessProfile(companyId, userCompanyId, userId);
        var authMethod = attendanceAccessService.resolveRequestedAuthMethod(payload, accessProfile.defaultMethod());
        var kioskDeviceId = normalizeOptionalForeignKey(parseLong(payload, "kiosk_device_id"));
        var kioskDevice = kioskDeviceId == null ? null : attendanceKioskDeviceRepository.get(companyId, kioskDeviceId);
        var activeAccessMethod = attendanceAccessService.resolveActiveAccessMethod(companyId, accessProfile.id(), authMethod);
        var faceVerificationSessionId = normalizeOptionalForeignKey(parseLong(payload, "face_verification_session_id"));
        var credentialPayload = nullable(stringValue(payload, "credential_payload", "credential", "pin", "password", "badge_code"));
        var notes = nullable(stringValue(payload, "notes"));
        var metadataJson = toJson(payload.get("metadata"));

        var requestedLocationId = parseLong(payload, "location_id");
        BigDecimal latitude = null;
        BigDecimal longitude = null;
        LocationRow location = null;
        var photoObjectKey = attendancePhotoService.normalizeAttendancePhotoObjectKey(companyId, userCompanyId, stringValue(payload, "photo_url"));

        if (!"auth_attempt".equals(eventKind)) {
            latitude = parseDecimalRequired(payload, "latitude");
            longitude = parseDecimalRequired(payload, "longitude");
        } else if (kioskDevice != null && kioskDevice.locationId() != null) {
            location = loadLocation(companyId, kioskDevice.locationId());
        }

        var authResultStatus = attendanceAccessService.validateAuthAttempt(accessProfile, activeAccessMethod, authMethod, credentialPayload);
        var authAttemptMetadata = mergeMetadataJson(metadataJson, Map.of(
            "user_company_id", userCompanyId,
            "event_kind", eventKind
        ));
        var authAttemptId = appendAttendanceEvent(
            companyId,
            userCompanyId,
            "auth_attempt",
            eventTimestamp,
            eventTimestamp.toLocalDate(),
            location == null ? null : location.id(),
            kioskDevice == null ? null : kioskDevice.id(),
            latitude,
            longitude,
            null,
            "kiosk",
            authMethod,
            authResultStatus,
            "auth_attempt",
            authAttemptMetadata,
            notes,
            null,
            userId
        );

        if ("failure".equals(authResultStatus) || "rejected".equals(authResultStatus)) {
            throw new IllegalArgumentException("Credential validation failed.");
        }

        if ("auth_attempt".equals(eventKind)) {
            return Map.of(
                "event_id", authAttemptId,
                "user_company_id", userCompanyId,
                "result_status", authResultStatus,
                "auth_method", authMethod
            );
        }

        if ("facial_recognition".equals(authMethod)) {
            hrFaceService.consumeSuccessfulVerificationSession(companyId, userCompanyId, faceVerificationSessionId);
        }
        var attendanceDate = resolveOperationalAttendanceDate(companyId, userCompanyId, eventTimestamp, eventKind);
        var scheduleRule = loadScheduleRule(companyId, userCompanyId, attendanceDate);
        var activeWorkSite = loadActiveWorkSiteAssignment(companyId, userCompanyId, attendanceDate);
        if (!"auth_attempt".equals(eventKind)) {
            var resolvedLocationId = requestedLocationId == null && kioskDevice != null ? kioskDevice.locationId() : requestedLocationId;
            location = resolveScheduleRegistrationLocation(
                companyId,
                user,
                scheduleRule,
                eventKind,
                resolvedLocationId,
                latitude,
                longitude,
                activeWorkSite
            );
        }
        validateScheduleRegistrationPolicy(scheduleRule, eventKind, eventTimestamp, attendanceDate);
        validateOperationalEventTransition(companyId, userCompanyId, attendanceDate, eventTimestamp, eventKind);

        var operationalResultStatus = "manual_override".equals(authMethod) ? "overridden" : "success";
        var operationalEventId = appendAttendanceEvent(
            companyId,
            userCompanyId,
            eventType,
            eventTimestamp,
            attendanceDate,
            location == null ? null : location.id(),
            kioskDevice == null ? null : kioskDevice.id(),
            latitude,
            longitude,
            photoObjectKey,
            "kiosk",
            authMethod,
            operationalResultStatus,
            eventKind,
            metadataJson,
            notes,
            null,
            userId
        );

        var dailyRecord = rebuildDailyRecordProjection(companyId, userCompanyId, attendanceDate);
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", operationalEventId);
        result.put("auth_attempt_event_id", authAttemptId);
        result.put("user_company_id", userCompanyId);
        result.put("event_kind", eventKind);
        result.put("auth_method", authMethod);
        result.put("result_status", operationalResultStatus);
        result.put("status", resolveEffectiveStatus(dailyRecord, scheduleRule, attendanceDate));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
        result.put("photo_object_key", photoObjectKey);
        return result;
    }
}
