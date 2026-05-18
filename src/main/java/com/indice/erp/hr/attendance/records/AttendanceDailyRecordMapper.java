package com.indice.erp.hr.attendance.records;

import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.LocationRow;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeAttendanceStatus;
import static com.indice.erp.hr.attendance.support.AttendanceInput.normalizeNullableAttendanceStatus;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Component
class AttendanceDailyRecordMapper {

    DailyRecordRow mapDailyRecord(ResultSet rs) throws SQLException {
        return new DailyRecordRow(
            rs.getLong("id"),
            rs.getLong("user_company_id"),
            rs.getObject("attendance_date", LocalDate.class),
            normalizeAttendanceStatus(rs.getString("system_status")),
            normalizeNullableAttendanceStatus(rs.getString("corrected_status")),
            toLocalDateTime(rs.getTimestamp("first_check_in_at")),
            toLocalDateTime(rs.getTimestamp("last_check_out_at")),
            rs.getInt("minutes_late"),
            nullable(rs.getString("notes")),
            safe(rs.getString("first_photo_object_key")),
            safe(rs.getString("last_photo_object_key")),
            mapLocation(rs, "first_location"),
            mapLocation(rs, "last_location"),
            rs.getBigDecimal("first_event_latitude"),
            rs.getBigDecimal("first_event_longitude"),
            rs.getBigDecimal("last_event_latitude"),
            rs.getBigDecimal("last_event_longitude")
        );
    }

    LocationRow mapLocation(ResultSet rs, String prefix) throws SQLException {
        var id = getNullableLong(rs, prefix + "_id");
        if (id == null) {
            return null;
        }
        return new LocationRow(
            id,
            null,
            "",
            null,
            "",
            null,
            null,
            safe(rs.getString(prefix + "_name")),
            rs.getBigDecimal(prefix + "_latitude"),
            rs.getBigDecimal(prefix + "_longitude"),
            rs.getInt(prefix + "_radius_meters"),
            null,
            null,
            null,
            null,
            "active",
            0,
            ""
        );
    }

    String dailyRecordSelectSql(String whereClause) {
        return commonDailyRecordSelect("e.user_company_id") + whereClause;
    }

    String userDailyRecordSelectSql(String whereClause) {
        return commonDailyRecordSelect("e.user_id") + whereClause;
    }

    String commonDailyRecordSelect(String eventUserColumn) {
        var recordUserColumn = "r." + eventUserColumn.substring(2);
        return """
            SELECT r.id,
                   r.user_company_id,
                   r.attendance_date,
                   r.system_status,
                   r.corrected_status,
                   r.first_check_in_at,
                   r.last_check_out_at,
                   r.minutes_late,
                   r.notes,
                   (
                       SELECT e.photo_url
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_in'
                       ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                e.event_timestamp ASC,
                                e.id ASC
                       LIMIT 1
                   ) AS first_photo_object_key,
                   (
                       SELECT e.photo_url
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_out'
                       ORDER BY CASE WHEN COALESCE(TRIM(e.photo_url), '') = '' THEN 1 ELSE 0 END ASC,
                                e.event_timestamp DESC,
                                e.id DESC
                       LIMIT 1
                   ) AS last_photo_object_key,
                   (
                       SELECT e.latitude
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_in'
                       ORDER BY CASE WHEN e.latitude IS NULL OR e.longitude IS NULL THEN 1 ELSE 0 END ASC,
                                e.event_timestamp ASC,
                                e.id ASC
                       LIMIT 1
                   ) AS first_event_latitude,
                   (
                       SELECT e.longitude
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_in'
                       ORDER BY CASE WHEN e.latitude IS NULL OR e.longitude IS NULL THEN 1 ELSE 0 END ASC,
                                e.event_timestamp ASC,
                                e.id ASC
                       LIMIT 1
                   ) AS first_event_longitude,
                   (
                       SELECT e.latitude
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_out'
                       ORDER BY CASE WHEN e.latitude IS NULL OR e.longitude IS NULL THEN 1 ELSE 0 END ASC,
                                e.event_timestamp DESC,
                                e.id DESC
                       LIMIT 1
                   ) AS last_event_latitude,
                   (
                       SELECT e.longitude
                       FROM user_attendance_events e
                       WHERE e.company_id = r.company_id
                         AND %s = %s
                         AND e.attendance_date = r.attendance_date
                         AND e.event_type = 'check_out'
                       ORDER BY CASE WHEN e.latitude IS NULL OR e.longitude IS NULL THEN 1 ELSE 0 END ASC,
                                e.event_timestamp DESC,
                                e.id DESC
                       LIMIT 1
                   ) AS last_event_longitude,
                   fl.id AS first_location_id,
                   fl.name AS first_location_name,
                   fl.latitude AS first_location_latitude,
                   fl.longitude AS first_location_longitude,
                   fl.radius_meters AS first_location_radius_meters,
                   ll.id AS last_location_id,
                   ll.name AS last_location_name,
                   ll.latitude AS last_location_latitude,
                   ll.longitude AS last_location_longitude,
                   ll.radius_meters AS last_location_radius_meters
            FROM user_attendance_daily_records r
            LEFT JOIN attendance_locations fl ON fl.id = r.first_location_id
            LEFT JOIN attendance_locations ll ON ll.id = r.last_location_id
            """.formatted(
                eventUserColumn,
                recordUserColumn,
                eventUserColumn,
                recordUserColumn,
                eventUserColumn,
                recordUserColumn,
                eventUserColumn,
                recordUserColumn,
                eventUserColumn,
                recordUserColumn,
                eventUserColumn,
                recordUserColumn
            );
    }

    LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    Long getNullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }
}
