package com.indice.erp.hr.attendance.usecases.control;

import com.indice.erp.hr.attendance.models.ControlActivityRow;
import com.indice.erp.hr.attendance.usecases.events.HrAttendanceEventTransitionSupport;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceControlActivitySupport extends HrAttendanceEventTransitionSupport {

    protected HrAttendanceControlActivitySupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected Map<String, Object> toControlActivityMap(ControlActivityRow event) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", event.id());
        body.put("user_company_id", event.userCompanyId());
        body.put("user_code", event.userCode());
        body.put("user_name", event.userName());
        body.put("kiosk_device_id", event.kioskDeviceId());
        body.put("kiosk_device_name", event.kioskDeviceName());
        body.put("location_id", event.locationId());
        body.put("location_name", event.locationName());
        body.put("event_type", event.eventType());
        body.put("event_kind", event.eventKind());
        body.put("auth_method", event.authMethod());
        body.put("result_status", event.resultStatus());
        body.put("event_timestamp", toIsoString(event.eventTimestamp()));
        body.put("photo_url", attendancePhotoService.signedAttendancePhotoUrl(event.photoObjectKey()));
        body.put("notes", event.notes());
        body.put("metadata", parseJsonMap(event.metadataJson()));
        return body;
    }

    protected List<ControlActivityRow> loadRecentControlActivity(long companyId, LocalDate date, int limit) {
        return jdbcTemplate.query(
            """
                SELECT e.id,
                       e.user_company_id,
                       COALESCE(emp.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(emp.first_name, ''), COALESCE(emp.last_name, ''))) AS user_name,
                       e.kiosk_device_id,
                       COALESCE(d.name, '') AS kiosk_device_name,
                       e.location_id,
                       COALESCE(l.name, '') AS location_name,
                       COALESCE(e.event_type, '') AS event_type,
                       COALESCE(e.event_kind, e.event_type, '') AS event_kind,
                       COALESCE(e.auth_method, '') AS auth_method,
                       COALESCE(e.result_status, '') AS result_status,
                       e.event_timestamp,
                       COALESCE(e.photo_url, '') AS photo_object_key,
                       COALESCE(e.notes, '') AS notes,
                       COALESCE(CAST(e.metadata_json AS CHAR), '') AS metadata_json
                FROM user_attendance_events e
                JOIN hr_users emp ON emp.id = e.user_company_id
                LEFT JOIN attendance_kiosk_devices d ON d.id = e.kiosk_device_id
                LEFT JOIN attendance_locations l ON l.id = e.location_id
                WHERE e.company_id = ?
                  AND e.attendance_date = ?
                ORDER BY e.event_timestamp DESC, e.id DESC
                LIMIT ?
                """,
            (rs, rowNum) -> new ControlActivityRow(
                rs.getLong("id"),
                rs.getLong("user_company_id"),
                safe(rs.getString("user_code")),
                safe(rs.getString("user_name")),
                getNullableLong(rs, "kiosk_device_id"),
                safe(rs.getString("kiosk_device_name")),
                getNullableLong(rs, "location_id"),
                safe(rs.getString("location_name")),
                safe(rs.getString("event_type")),
                safe(rs.getString("event_kind")),
                safe(rs.getString("auth_method")),
                safe(rs.getString("result_status")),
                toLocalDateTime(rs.getTimestamp("event_timestamp")),
                safe(rs.getString("photo_object_key")),
                safe(rs.getString("notes")),
                safe(rs.getString("metadata_json"))
            ),
            companyId,
            date,
            limit
        );
    }

    protected Map<Long, Map<String, String>> loadControlPhotoObjectKeysByUser(long companyId, LocalDate date) {
        var photosByUser = new HashMap<Long, Map<String, String>>();
        jdbcTemplate.query(
            """
                SELECT e.user_company_id,
                       COALESCE(e.event_type, '') AS event_type,
                       COALESCE(e.photo_url, '') AS photo_object_key
                FROM user_attendance_events e
                WHERE e.company_id = ?
                  AND e.attendance_date = ?
                  AND e.event_type IN ('check_in', 'check_out')
                  AND COALESCE(TRIM(e.photo_url), '') <> ''
                  AND COALESCE(e.result_status, 'success') IN ('success', 'overridden')
                ORDER BY e.event_timestamp ASC, e.id ASC
                """,
            rs -> {
                var userCompanyId = rs.getLong("user_company_id");
                var eventType = safe(rs.getString("event_type"));
                var photoObjectKey = safe(rs.getString("photo_object_key"));
                var userPhotos = photosByUser.computeIfAbsent(userCompanyId, ignored -> new HashMap<>());

                if ("check_in".equals(eventType)) {
                    userPhotos.putIfAbsent("first_check_in", photoObjectKey);
                } else if ("check_out".equals(eventType)) {
                    userPhotos.put("last_check_out", photoObjectKey);
                }
            },
            companyId,
            date
        );
        return photosByUser;
    }
}
