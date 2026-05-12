package com.indice.erp.hr.attendance.assignment;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class AttendanceAssignmentConflictRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceAssignmentConflictRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean hasAttendanceActivityInRange(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer eventCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_attendance_events
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND attendance_date BETWEEN ? AND ?
                  AND event_type IN ('check_in', 'check_out', 'break_out', 'break_in')
                """,
            Integer.class,
            companyId,
            userCompanyId,
            startDate,
            rangeEnd
        );
        if (eventCount != null && eventCount > 0) {
            return true;
        }

        Integer recordCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_attendance_daily_records
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND attendance_date BETWEEN ? AND ?
                  AND (first_check_in_at IS NOT NULL OR last_check_out_at IS NOT NULL)
                """,
            Integer.class,
            companyId,
            userCompanyId,
            startDate,
            rangeEnd
        );
        return recordCount != null && recordCount > 0;
    }

    public boolean hasActiveScheduleAssignmentOverlap(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return hasActiveAssignmentOverlap("user_schedule_assignments", companyId, userCompanyId, startDate, endDate);
    }

    public boolean hasActiveWorkSiteAssignmentOverlap(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return hasActiveAssignmentOverlap("user_work_site_assignments", companyId, userCompanyId, startDate, endDate);
    }

    public boolean hasActiveWorkSiteLocationAssignmentOverlap(long companyId, long locationId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM user_work_site_assignments
                WHERE company_id = ?
                  AND location_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                """,
            Integer.class,
            companyId,
            locationId,
            rangeEnd,
            startDate
        );
        return count != null && count > 0;
    }

    public LocalDate assignmentRangeEnd(LocalDate endDate) {
        return endDate == null ? LocalDate.of(9999, 12, 31) : endDate;
    }

    private boolean hasActiveAssignmentOverlap(String tableName, long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        var rangeEnd = assignmentRangeEnd(endDate);
        Integer count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM %s
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                """.formatted(tableName),
            Integer.class,
            companyId,
            userCompanyId,
            rangeEnd,
            startDate
        );
        return count != null && count > 0;
    }
}
