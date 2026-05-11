package com.indice.erp.hr.attendance;

import java.time.LocalDate;
import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AttendanceAssignmentService {

    private final JdbcTemplate jdbcTemplate;

    public AttendanceAssignmentService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void validateScheduleTemplateWorkSiteCompatibility(ScheduleTemplateDefinition template, LocationRow workSite) {
        if (template == null || workSite == null || !template.enforceLocation() || template.locationId() == null) {
            return;
        }

        if (!Objects.equals(template.locationId(), workSite.id())) {
            throw new IllegalArgumentException("The selected schedule location does not match the assigned contract site.");
        }
    }

    public void validateScheduleTemplateWorkSiteCompatibility(ScheduleTemplateDefinition template, WorkSiteAssignmentRow workSiteAssignment) {
        validateScheduleTemplateWorkSiteCompatibility(template, workSiteAssignment == null ? null : workSiteAssignment.location());
    }

    public void validateLocationCanBeAssigned(LocationRow location) {
        if (location == null || "inactive".equalsIgnoreCase(location.status())) {
            throw new IllegalArgumentException("Only active locations can be assigned.");
        }
    }

    public void validateNewAssignmentDateRange(LocalDate startDate, LocalDate endDate) {
        if (endDate == null) {
            throw new IllegalArgumentException("effective_end_date is required.");
        }
        if (startDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("effective_start_date cannot be in the past.");
        }
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("effective_end_date must be on or after effective_start_date.");
        }
    }

    public void validateAssignmentWithinContractSiteWindow(LocationRow location, LocalDate startDate, LocalDate endDate) {
        if (location == null || startDate == null || endDate == null) {
            return;
        }
        if (location.contractStartDate() != null && startDate.isBefore(location.contractStartDate())) {
            throw new IllegalArgumentException(contractSiteWindowMessage(location));
        }
        if (location.contractEndDate() != null && endDate.isAfter(location.contractEndDate())) {
            throw new IllegalArgumentException(contractSiteWindowMessage(location));
        }
    }

    public void validateUserIsFreeForAssignment(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        if (hasAttendanceActivityInRange(companyId, userCompanyId, startDate, endDate)) {
            throw new IllegalArgumentException("HR user already has attendance activity in this date range. Remove the existing shift or choose another date.");
        }
        if (hasActiveWorkSiteAssignmentOverlap(companyId, userCompanyId, startDate, endDate)) {
            throw new IllegalArgumentException("HR user already has an active contract site assignment in this date range. Remove the existing shift before assigning a contract site.");
        }
        if (hasActiveScheduleAssignmentOverlap(companyId, userCompanyId, startDate, endDate)) {
            throw new IllegalArgumentException("HR user already has an active schedule in this date range. Remove the existing shift before assigning new work.");
        }
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
        return hasActiveAssignmentOverlap(
            "user_schedule_assignments",
            companyId,
            userCompanyId,
            startDate,
            endDate
        );
    }

    public boolean hasActiveWorkSiteAssignmentOverlap(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return hasActiveAssignmentOverlap(
            "user_work_site_assignments",
            companyId,
            userCompanyId,
            startDate,
            endDate
        );
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

    public int closeOverlappingScheduleAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        var overlapEnd = assignmentRangeEnd(endDate);
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       template_id AS assignment_target_id,
                       effective_start_date,
                       effective_end_date
                FROM user_schedule_assignments
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                ORDER BY effective_start_date ASC, id ASC
                """,
            (rs, rowNum) -> new ExistingAssignmentRow(
                rs.getLong("id"),
                rs.getLong("assignment_target_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            userCompanyId,
            overlapEnd,
            startDate
        );

        int updatedCount = 0;
        for (var row : rows) {
            updatedCount += removeAssignmentDateFromRange(
                "user_schedule_assignments",
                "template_id",
                row,
                companyId,
                userId,
                userCompanyId,
                startDate,
                overlapEnd
            );
        }
        return updatedCount;
    }

    public int closeOverlappingWorkSiteAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        var overlapEnd = assignmentRangeEnd(endDate);
        var rows = jdbcTemplate.query(
            """
                SELECT id,
                       location_id AS assignment_target_id,
                       effective_start_date,
                       effective_end_date
                FROM user_work_site_assignments
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                ORDER BY effective_start_date ASC, id ASC
                """,
            (rs, rowNum) -> new ExistingAssignmentRow(
                rs.getLong("id"),
                rs.getLong("assignment_target_id"),
                rs.getObject("effective_start_date", LocalDate.class),
                rs.getObject("effective_end_date", LocalDate.class)
            ),
            companyId,
            userCompanyId,
            overlapEnd,
            startDate
        );

        int updatedCount = 0;
        for (var row : rows) {
            updatedCount += removeAssignmentDateFromRange(
                "user_work_site_assignments",
                "location_id",
                row,
                companyId,
                userId,
                userCompanyId,
                startDate,
                overlapEnd
            );
        }
        return updatedCount;
    }

    private boolean hasActiveAssignmentOverlap(
        String tableName,
        long companyId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
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

    private int removeAssignmentDateFromRange(
        String tableName,
        String assignmentColumn,
        ExistingAssignmentRow row,
        long companyId,
        long userId,
        long userCompanyId,
        LocalDate removeStartDate,
        LocalDate removeEndDate
    ) {
        var rowEnd = assignmentRangeEnd(row.effectiveEndDate());
        var afterStart = removeEndDate.plusDays(1);
        var operations = 0;

        if (row.effectiveStartDate().isBefore(removeStartDate)) {
            operations += jdbcTemplate.update(
                """
                    UPDATE %s
                    SET effective_end_date = ?
                    WHERE id = ?
                    """.formatted(tableName),
                removeStartDate.minusDays(1),
                row.id()
            );

            if (rowEnd.isAfter(removeEndDate)) {
                operations += insertAssignmentRemainder(
                    tableName,
                    assignmentColumn,
                    companyId,
                    userId,
                    userCompanyId,
                    row.assignmentTargetId(),
                    afterStart,
                    row.effectiveEndDate()
                );
            }
            return operations;
        }

        if (rowEnd.isAfter(removeEndDate)) {
            operations += jdbcTemplate.update(
                """
                    UPDATE %s
                    SET effective_start_date = ?
                    WHERE id = ?
                    """.formatted(tableName),
                afterStart,
                row.id()
            );
            return operations;
        }

        operations += jdbcTemplate.update(
            """
                UPDATE %s
                SET status = 'inactive',
                    effective_end_date = ?
                WHERE id = ?
                """.formatted(tableName),
            row.effectiveEndDate() != null ? row.effectiveEndDate() : row.effectiveStartDate(),
            row.id()
        );
        return operations;
    }

    private int insertAssignmentRemainder(
        String tableName,
        String assignmentColumn,
        long companyId,
        long userId,
        long userCompanyId,
        long assignmentTargetId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
        return jdbcTemplate.update(
            """
                INSERT INTO %s
                (company_id, user_company_id, %s, effective_start_date, effective_end_date, status, created_by)
                VALUES (?, ?, ?, ?, ?, 'active', ?)
                """.formatted(tableName, assignmentColumn),
            companyId,
            userCompanyId,
            assignmentTargetId,
            effectiveStartDate,
            effectiveEndDate,
            userId
        );
    }

    private String contractSiteWindowMessage(LocationRow location) {
        var startDate = location.contractStartDate() == null ? "the first configured day" : location.contractStartDate().toString();
        var endDate = location.contractEndDate() == null ? "the last configured day" : location.contractEndDate().toString();
        return "Contract site is only open from " + startDate + " to " + endDate + ".";
    }
}
