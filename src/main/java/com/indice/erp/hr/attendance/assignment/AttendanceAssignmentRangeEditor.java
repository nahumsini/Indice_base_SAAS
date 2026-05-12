package com.indice.erp.hr.attendance.assignment;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;


@Repository
public class AttendanceAssignmentRangeEditor {

    private final JdbcTemplate jdbcTemplate;
    private final AttendanceAssignmentConflictRepository conflicts;

    public AttendanceAssignmentRangeEditor(JdbcTemplate jdbcTemplate, AttendanceAssignmentConflictRepository conflicts) {
        this.jdbcTemplate = jdbcTemplate;
        this.conflicts = conflicts;
    }

    public int closeOverlappingScheduleAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return closeOverlappingAssignments("user_schedule_assignments", "template_id", companyId, userId, userCompanyId, startDate, endDate);
    }

    public int closeOverlappingWorkSiteAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return closeOverlappingAssignments("user_work_site_assignments", "location_id", companyId, userId, userCompanyId, startDate, endDate);
    }

    private int closeOverlappingAssignments(
        String tableName,
        String assignmentColumn,
        long companyId,
        long userId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        var overlapEnd = conflicts.assignmentRangeEnd(endDate);
        var rows = jdbcTemplate.query(
            """
                SELECT id, %s AS assignment_target_id, effective_start_date, effective_end_date
                FROM %s
                WHERE company_id = ?
                  AND user_company_id = ?
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND effective_start_date <= ?
                  AND (effective_end_date IS NULL OR effective_end_date >= ?)
                ORDER BY effective_start_date ASC, id ASC
                """.formatted(assignmentColumn, tableName),
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

        var updatedCount = 0;
        for (var row : rows) {
            updatedCount += removeAssignmentDateFromRange(tableName, assignmentColumn, row, companyId, userId, userCompanyId, startDate, overlapEnd);
        }
        return updatedCount;
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
        var rowEnd = conflicts.assignmentRangeEnd(row.effectiveEndDate());
        var afterStart = removeEndDate.plusDays(1);
        var operations = 0;

        if (row.effectiveStartDate().isBefore(removeStartDate)) {
            operations += jdbcTemplate.update("UPDATE %s SET effective_end_date = ? WHERE id = ?".formatted(tableName), removeStartDate.minusDays(1), row.id());
            if (rowEnd.isAfter(removeEndDate)) {
                operations += insertAssignmentRemainder(tableName, assignmentColumn, companyId, userId, userCompanyId, row.assignmentTargetId(), afterStart, row.effectiveEndDate());
            }
            return operations;
        }

        if (rowEnd.isAfter(removeEndDate)) {
            return operations + jdbcTemplate.update("UPDATE %s SET effective_start_date = ? WHERE id = ?".formatted(tableName), afterStart, row.id());
        }

        return operations + jdbcTemplate.update(
            "UPDATE %s SET status = 'inactive', effective_end_date = ? WHERE id = ?".formatted(tableName),
            row.effectiveEndDate() != null ? row.effectiveEndDate() : row.effectiveStartDate(),
            row.id()
        );
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

    private record ExistingAssignmentRow(
        long id,
        long assignmentTargetId,
        LocalDate effectiveStartDate,
        LocalDate effectiveEndDate
    ) {
    }
}
