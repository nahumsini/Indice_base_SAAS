package com.indice.erp.hr.attendance.assignment;

import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import java.time.LocalDate;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;


@Service
public class AttendanceAssignmentService {

    private final AttendanceAssignmentConflictRepository conflicts;
    private final AttendanceAssignmentRangeEditor rangeEditor;

    @Autowired
    public AttendanceAssignmentService(
        AttendanceAssignmentConflictRepository conflicts,
        AttendanceAssignmentRangeEditor rangeEditor
    ) {
        this.conflicts = conflicts;
        this.rangeEditor = rangeEditor;
    }

    public AttendanceAssignmentService(JdbcTemplate jdbcTemplate) {
        this(
            new AttendanceAssignmentConflictRepository(jdbcTemplate),
            new AttendanceAssignmentRangeEditor(jdbcTemplate, new AttendanceAssignmentConflictRepository(jdbcTemplate))
        );
    }

    public void validateScheduleTemplateWorkSiteCompatibility(boolean enforceLocation, Long templateLocationId, LocationRow workSite) {
        if (workSite == null || !enforceLocation || templateLocationId == null) {
            return;
        }
        if (!Objects.equals(templateLocationId, workSite.id())) {
            throw new IllegalArgumentException("The selected schedule location does not match the assigned contract site.");
        }
    }

    public void validateScheduleTemplateWorkSiteCompatibility(boolean enforceLocation, Long templateLocationId, WorkSiteAssignmentRow assignment) {
        validateScheduleTemplateWorkSiteCompatibility(enforceLocation, templateLocationId, assignment == null ? null : assignment.location());
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
        return conflicts.hasAttendanceActivityInRange(companyId, userCompanyId, startDate, endDate);
    }

    public boolean hasActiveScheduleAssignmentOverlap(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return conflicts.hasActiveScheduleAssignmentOverlap(companyId, userCompanyId, startDate, endDate);
    }

    public boolean hasActiveWorkSiteAssignmentOverlap(long companyId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return conflicts.hasActiveWorkSiteAssignmentOverlap(companyId, userCompanyId, startDate, endDate);
    }

    public boolean hasActiveWorkSiteLocationAssignmentOverlap(long companyId, long locationId, LocalDate startDate, LocalDate endDate) {
        return conflicts.hasActiveWorkSiteLocationAssignmentOverlap(companyId, locationId, startDate, endDate);
    }

    public LocalDate assignmentRangeEnd(LocalDate endDate) {
        return conflicts.assignmentRangeEnd(endDate);
    }

    public int closeOverlappingScheduleAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return rangeEditor.closeOverlappingScheduleAssignments(companyId, userId, userCompanyId, startDate, endDate);
    }

    public int closeOverlappingWorkSiteAssignments(long companyId, long userId, long userCompanyId, LocalDate startDate, LocalDate endDate) {
        return rangeEditor.closeOverlappingWorkSiteAssignments(companyId, userId, userCompanyId, startDate, endDate);
    }

    private String contractSiteWindowMessage(LocationRow location) {
        var startDate = location.contractStartDate() == null ? "the first configured day" : location.contractStartDate().toString();
        var endDate = location.contractEndDate() == null ? "the last configured day" : location.contractEndDate().toString();
        return "Contract site is only open from " + startDate + " to " + endDate + ".";
    }
}
