package com.indice.erp.hr.attendance.usecases.events;

import com.indice.erp.hr.attendance.models.AttendanceEventRow;
import com.indice.erp.hr.attendance.models.AutoCheckoutCandidate;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.List;

import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


public abstract class HrAttendanceEventReadSupport extends HrAttendanceEventWriterSupport {

    protected HrAttendanceEventReadSupport(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    protected List<AttendanceEventRow> loadAttendanceEventRows(long companyId, long userCompanyId, LocalDate date) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       event_type,
                       event_timestamp,
                       attendance_date,
                       location_id,
                       kiosk_device_id,
                       auth_method,
                       result_status,
                       event_kind,
                       notes,
                       metadata_json,
                       supersedes_event_id,
                       created_by
                FROM user_attendance_events
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND attendance_date = ?
                ORDER BY event_timestamp ASC, id ASC
                """,
            (rs, rowNum) -> new AttendanceEventRow(
                rs.getLong("id"),
                safe(rs.getString("event_type")),
                toLocalDateTime(rs.getTimestamp("event_timestamp")),
                rs.getObject("attendance_date", LocalDate.class),
                getNullableLong(rs, "location_id"),
                getNullableLong(rs, "kiosk_device_id"),
                safe(rs.getString("auth_method")),
                safe(rs.getString("result_status")),
                safe(rs.getString("event_kind")),
                safe(rs.getString("notes")),
                safe(rs.getString("metadata_json")),
                getNullableLong(rs, "supersedes_event_id"),
                getNullableLong(rs, "created_by")
            ),
            companyId,
            userCompanyId,
            date
        );
    }

    protected List<AttendanceEventRow> loadUserAttendanceEventRows(long companyId, long userId, LocalDate date) {
        return jdbcTemplate.query(
            """
                SELECT id,
                       event_type,
                       event_timestamp,
                       attendance_date,
                       location_id,
                       kiosk_device_id,
                       auth_method,
                       result_status,
                       event_kind,
                       notes,
                       metadata_json,
                       supersedes_event_id,
                       created_by
                FROM user_attendance_events
                WHERE company_id = ?
                  AND user_id = ?
                  AND attendance_date = ?
                ORDER BY event_timestamp ASC, id ASC
                """,
            (rs, rowNum) -> new AttendanceEventRow(
                rs.getLong("id"),
                safe(rs.getString("event_type")),
                toLocalDateTime(rs.getTimestamp("event_timestamp")),
                rs.getObject("attendance_date", LocalDate.class),
                getNullableLong(rs, "location_id"),
                getNullableLong(rs, "kiosk_device_id"),
                safe(rs.getString("auth_method")),
                safe(rs.getString("result_status")),
                safe(rs.getString("event_kind")),
                safe(rs.getString("notes")),
                safe(rs.getString("metadata_json")),
                getNullableLong(rs, "supersedes_event_id"),
                getNullableLong(rs, "created_by")
            ),
            companyId,
            userId,
            date
        );
    }

    protected List<AutoCheckoutCandidate> loadAutoCheckoutCandidates(LocalDate latestAttendanceDate) {
        return jdbcTemplate.query(
            """
                SELECT company_id,
                       user_company_id,
                       attendance_date,
                       first_check_in_at,
                       first_location_id
                FROM user_attendance_daily_records
                WHERE first_check_in_at IS NOT NULL
                  AND last_check_out_at IS NULL
                  AND attendance_date <= ?
                ORDER BY attendance_date ASC, company_id ASC, user_company_id ASC
                LIMIT 500
                """,
            (rs, rowNum) -> new AutoCheckoutCandidate(
                rs.getLong("company_id"),
                rs.getLong("user_company_id"),
                rs.getObject("attendance_date", LocalDate.class),
                toLocalDateTime(rs.getTimestamp("first_check_in_at")),
                getNullableLong(rs, "first_location_id")
            ),
            latestAttendanceDate
        );
    }

    protected boolean hasSuccessfulCheckoutEvent(long companyId, long userCompanyId, LocalDate date) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_attendance_events
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND attendance_date = ?
                  AND event_kind = 'check_out'
                  AND result_status IN ('success', 'overridden')
                """,
            Integer.class,
            companyId,
            userCompanyId,
            date
        );
        return count != null && count > 0;
    }
}
