package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.parseDecimalRequired;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendanceSelfKioskEventUseCases extends HrAttendanceAdminKioskEventUseCases {

    protected HrAttendanceSelfKioskEventUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> recordSelfKioskEvent(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        return recordUserAttendanceEvent(companyId, attendanceUserLookupService.loadAttendanceSessionUser(companyId, userId), payload);
    }

    protected Map<String, Object> recordUserAttendanceEvent(long companyId, AttendanceUser user, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var eventKind = normalizeEventKind(stringValue(payload, "event_kind", "event_type", "registro_tipo"));
        var eventType = normalizeEventTypeForStorage(eventKind);
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        if (eventTimestamp == null) {
            eventTimestamp = LocalDateTime.now();
        }
        validateOperationalEventDate(eventKind, eventTimestamp);

        var latitude = parseDecimalRequired(payload, "latitude");
        var longitude = parseDecimalRequired(payload, "longitude");
        var requestedLocationId = parseLong(payload, "location_id");
        var photoObjectKey = attendancePhotoService.normalizeUserAttendancePhotoObjectKey(companyId, user.userId(), stringValue(payload, "photo_url"));
        var attendanceDate = resolveUserOperationalAttendanceDate(companyId, user.userId(), eventTimestamp, eventKind);
        var location = resolveUserAttendanceLocation(companyId, requestedLocationId, latitude, longitude);
        validateUserOperationalEventTransition(companyId, user.userId(), attendanceDate, eventTimestamp, eventKind);

        var metadataJson = mergeMetadataJson(
            toJson(payload.get("metadata")),
            Map.of(
                "subject_type", "user",
                "user_id", user.userId(),
                "user_company_id", user.userCompanyId(),
                "event_kind", eventKind
            )
        );

        var eventId = appendUserAttendanceEvent(
            companyId,
            user,
            eventType,
            eventTimestamp,
            attendanceDate,
            location.id(),
            null,
            latitude,
            longitude,
            photoObjectKey,
            "web_self",
            "session",
            "success",
            eventKind,
            metadataJson,
            nullable(stringValue(payload, "notes")),
            null,
            user.userId()
        );

        var dailyRecord = rebuildUserDailyRecordProjection(companyId, user, attendanceDate);
        var result = new LinkedHashMap<String, Object>();
        result.put("event_id", eventId);
        result.put("subject_type", "user");
        result.put("user_id", user.userId());
        result.put("user_company_id", user.userCompanyId());
        result.put("event_kind", eventKind);
        result.put("auth_method", "session");
        result.put("result_status", "success");
        result.put("status", resolveEffectiveStatus(dailyRecord, null, attendanceDate));
        result.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
        result.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
        result.put("location", toLocationMap(location));
        result.put("active_work_site", null);
        result.put("photo_object_key", photoObjectKey);
        return result;
    }
}
