package com.indice.erp.hr.attendance.usecases.photo;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.usecases.kiosk.HrAttendancePublicKioskIdentityUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeEventType;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeImageContentType;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDateTime;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.stringValue;


public abstract class HrAttendancePhotoUseCases extends HrAttendancePublicKioskIdentityUseCases {

    protected HrAttendancePhotoUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> createPhotoUpload(long companyId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("user_company_id is required.");
        }

        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("This user is terminated and cannot record attendance.");
        }

        var contentType = normalizeImageContentType(stringValue(payload, "content_type"));
        var eventType = stringValue(payload, "event_type");
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        var resolvedEventTimestamp = eventTimestamp == null ? LocalDateTime.now() : eventTimestamp;
        var normalizedEventType = normalizeEventType(eventType.isBlank() ? "check_in" : eventType);
        var attendanceDate = resolveOperationalAttendanceDate(companyId, userCompanyId, resolvedEventTimestamp, normalizedEventType);
        return attendancePhotoService.createAttendanceUpload(companyId, userCompanyId, contentType, eventType, attendanceDate);
    }

    protected Map<String, Object> createUserPhotoUpload(long companyId, AttendanceUser user, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var contentType = normalizeImageContentType(stringValue(payload, "content_type"));
        var eventType = stringValue(payload, "event_type");
        var eventTimestamp = parseDateTime(payload, "event_timestamp", "recorded_at");
        var resolvedEventTimestamp = eventTimestamp == null ? LocalDateTime.now() : eventTimestamp;
        var normalizedEventType = normalizeEventType(eventType.isBlank() ? "check_in" : eventType);
        var attendanceDate = resolveUserOperationalAttendanceDate(companyId, user.userId(), resolvedEventTimestamp, normalizedEventType);
        return attendancePhotoService.createUserAttendanceUpload(companyId, user.userId(), contentType, eventType, attendanceDate);
    }

    @Transactional
    public Map<String, Object> createSelfPhotoUpload(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var user = attendanceUserLookupService.loadAttendanceSessionUser(companyId, userId);
        return createUserPhotoUpload(companyId, user, payload);
    }
}
