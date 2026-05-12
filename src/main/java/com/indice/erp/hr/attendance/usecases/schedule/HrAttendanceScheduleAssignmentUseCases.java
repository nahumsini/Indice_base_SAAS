package com.indice.erp.hr.attendance.usecases.schedule;

import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.shared.HrPayloadUtils.longList;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;


public abstract class HrAttendanceScheduleAssignmentUseCases extends HrAttendanceScheduleTemplateUseCases {

    protected HrAttendanceScheduleAssignmentUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> bulkAssignScheduleTemplate(long companyId, long userId, Map<String, Object> payload) {
        payload = normalizePayload(payload);
        var templateId = parseLong(payload, "template_id");
        if (templateId == null || templateId <= 0) {
            throw new IllegalArgumentException("template_id is required.");
        }

        var template = loadExistingTemplate(companyId, templateId);
        if (!"active".equals(template.status())) {
            throw new IllegalArgumentException("Only active schedule templates can be assigned.");
        }

        var userCompanyIds = HrPayloadUtils.longList(payload, "user_company_ids");
        if (userCompanyIds.isEmpty()) {
            throw new IllegalArgumentException("user_company_ids is required.");
        }

        var effectiveStartDate = HrPayloadUtils.parseDate(payload, "effective_start_date", "start_date");
        if (effectiveStartDate == null) {
            throw new IllegalArgumentException("effective_start_date is required.");
        }

        var effectiveEndDate = HrPayloadUtils.parseDate(payload, "effective_end_date", "end_date");
        attendanceAssignmentService.validateNewAssignmentDateRange(effectiveStartDate, effectiveEndDate);

        var assignments = new ArrayList<Map<String, Object>>();
        for (var userCompanyId : userCompanyIds) {
            var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
            if ("terminated".equals(user.status())) {
                throw new IllegalArgumentException("Terminated users cannot receive schedule assignments.");
            }

            attendanceAssignmentService.validateUserIsFreeForAssignment(companyId, userCompanyId, effectiveStartDate, effectiveEndDate);
            jdbcTemplate.update(
                """
                    INSERT INTO user_schedule_assignments
                    (company_id, user_company_id, user_id, template_id, effective_start_date, effective_end_date, status, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
                    """,
                companyId,
                userCompanyId,
                attendanceUserLookupService.loadUserIdForCompanyUser(companyId, userCompanyId),
                templateId,
                effectiveStartDate,
                effectiveEndDate,
                userId
            );

            var assignment = new LinkedHashMap<String, Object>();
            assignment.put("user_company_id", userCompanyId);
            assignment.put("user_name", user.fullName());
            assignment.put("template_id", templateId);
            assignment.put("template_name", displayScheduleTemplateName(template.templateName()));
            assignment.put("effective_start_date", effectiveStartDate.toString());
            assignment.put("effective_end_date", effectiveEndDate == null ? null : effectiveEndDate.toString());
            assignments.add(assignment);
        }

        return Map.of(
            "assigned_count", assignments.size(),
            "template_id", templateId,
            "template_name", displayScheduleTemplateName(template.templateName()),
            "assignments", assignments
        );
    }
}
