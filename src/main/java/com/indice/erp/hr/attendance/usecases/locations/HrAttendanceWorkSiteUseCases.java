package com.indice.erp.hr.attendance.usecases.locations;

import com.indice.erp.hr.attendance.models.ScheduleTemplateDefinition;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.shared.HrPayloadUtils.longList;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;


public abstract class HrAttendanceWorkSiteUseCases extends HrAttendanceAllowedLocationUseCases {

    protected HrAttendanceWorkSiteUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> bulkAssignActiveWorkSite(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var locationId = normalizeOptionalForeignKey(parseLong(payload, "location_id", "work_site_location_id"));
        if (locationId == null) {
            throw new IllegalArgumentException("location_id is required.");
        }
        var location = loadLocation(companyId, locationId);
        attendanceAssignmentService.validateLocationCanBeAssigned(location);
        var templateId = normalizeOptionalForeignKey(parseLong(payload, "template_id", "schedule_template_id"));
        ScheduleTemplateDefinition template = null;
        if (templateId != null) {
            template = loadExistingTemplate(companyId, templateId);
            if (!"active".equals(template.status())) {
                throw new IllegalArgumentException("Only active schedule templates can be assigned.");
            }
            attendanceAssignmentService.validateScheduleTemplateWorkSiteCompatibility(template.enforceLocation(), template.locationId(), location);
        }

        var userCompanyIds = HrPayloadUtils.longList(payload, "user_company_ids");
        var singleUserCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyIds.isEmpty() && singleUserCompanyId != null) {
            userCompanyIds = List.of(singleUserCompanyId);
        }
        var uniqueUserCompanyIds = userCompanyIds.stream()
            .filter((userCompanyId) -> userCompanyId != null && userCompanyId > 0)
            .distinct()
            .toList();
        if (uniqueUserCompanyIds.isEmpty()) {
            throw new IllegalArgumentException("user_company_ids is required.");
        }
        if (uniqueUserCompanyIds.size() > 1) {
            throw new IllegalArgumentException("A contract site can only be assigned to one user at a time.");
        }

        var effectiveStartDate = HrPayloadUtils.parseDate(payload, "effective_start_date", "start_date");
        if (effectiveStartDate == null) {
            throw new IllegalArgumentException("effective_start_date is required.");
        }
        var effectiveEndDate = HrPayloadUtils.parseDate(payload, "effective_end_date", "end_date");
        attendanceAssignmentService.validateNewAssignmentDateRange(effectiveStartDate, effectiveEndDate);
        attendanceAssignmentService.validateAssignmentWithinContractSiteWindow(location, effectiveStartDate, effectiveEndDate);
        if (attendanceAssignmentService.hasActiveWorkSiteLocationAssignmentOverlap(companyId, location.id(), effectiveStartDate, effectiveEndDate)) {
            throw new IllegalArgumentException("This contract site is already assigned to another user in this date range.");
        }

        var assignments = new ArrayList<Map<String, Object>>();
        for (var userCompanyId : uniqueUserCompanyIds) {
            var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
            if ("terminated".equals(user.status())) {
                throw new IllegalArgumentException("Terminated users cannot receive contract site assignments.");
            }

            attendanceAssignmentService.validateUserIsFreeForAssignment(companyId, userCompanyId, effectiveStartDate, effectiveEndDate);
            ensureHrUserAllowedLocation(companyId, userId, userCompanyId, location.id());
            var assignmentId = insertWorkSiteAssignment(
                companyId,
                userId,
                userCompanyId,
                location.id(),
                effectiveStartDate,
                effectiveEndDate
            );
            if (template != null) {
                jdbcTemplate.update(
                    """
                        INSERT INTO user_schedule_assignments
                        (company_id, user_company_id, user_id, template_id, effective_start_date, effective_end_date, status, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
                        """,
                    companyId,
                    userCompanyId,
                    attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId),
                    template.templateId(),
                    effectiveStartDate,
                    effectiveEndDate,
                    userId
                );
            }

            var assignment = new LinkedHashMap<String, Object>();
            assignment.put("id", assignmentId);
            assignment.put("user_company_id", userCompanyId);
            assignment.put("user_name", user.fullName());
            assignment.put("location_id", location.id());
            assignment.put("location_name", location.name());
            assignment.put("location", toLocationMap(location));
            assignment.put("template_id", template == null ? null : template.templateId());
            assignment.put("template_name", template == null ? null : displayScheduleTemplateName(template.templateName()));
            assignment.put("effective_start_date", effectiveStartDate.toString());
            assignment.put("effective_end_date", effectiveEndDate == null ? null : effectiveEndDate.toString());
            assignment.put("status", "active");
            assignments.add(assignment);
        }

        return Map.of(
            "assigned_count", assignments.size(),
            "location", toLocationMap(location),
            "assignments", assignments
        );
    }

    @Transactional
    public Map<String, Object> clearHrUserWorkAssignments(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var userCompanyId = parseLong(payload, "user_company_id");
        if (userCompanyId == null || userCompanyId <= 0) {
            throw new IllegalArgumentException("user_company_id is required.");
        }
        var date = HrPayloadUtils.parseDate(payload, "date", "effective_start_date", "start_date");
        if (date == null) {
            throw new IllegalArgumentException("date is required.");
        }

        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        if ("terminated".equals(user.status())) {
            throw new IllegalArgumentException("Terminated users cannot have work assignments updated.");
        }

        var scheduleAssignmentsCleared = attendanceAssignmentService.closeOverlappingScheduleAssignments(companyId, userId, userCompanyId, date, date);
        var workSiteAssignmentsCleared = attendanceAssignmentService.closeOverlappingWorkSiteAssignments(companyId, userId, userCompanyId, date, date);

        return Map.of(
            "user_company_id", userCompanyId,
            "user_name", user.fullName(),
            "date", date.toString(),
            "schedule_assignments_cleared", scheduleAssignmentsCleared,
            "work_site_assignments_cleared", workSiteAssignmentsCleared
        );
    }

    public Map<String, Object> extractCoordinatesFromMapLink(Map<String, Object> payload) {
        return googleMapsCoordinateExtractor.extractCoordinatesFromMapLink(normalizePayload(payload));
    }
}
