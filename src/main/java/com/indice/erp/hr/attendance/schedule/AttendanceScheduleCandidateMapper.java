package com.indice.erp.hr.attendance.schedule;

import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.DailyRecordRow;
import com.indice.erp.hr.attendance.models.ScheduleRule;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.isOvernightSchedule;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.dateString;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


@Component
public class AttendanceScheduleCandidateMapper {

    Map<String, Object> toScheduleCandidateMap(
        AttendanceHrUser user,
        LocalDate date,
        ScheduleCandidateAssignment assignment,
        ScheduleRule scheduleRule,
        DailyRecordRow dailyRecord,
        ScheduleCandidateWorkSiteAssignment activeWorkSite,
        boolean hasRangeAttendanceActivity,
        boolean hasActiveWorkSiteOverlap,
        boolean hasActiveScheduleOverlap
    ) {
        var item = baseCandidateMap(user);
        var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
        var systemStatus = resolveSystemStatus(dailyRecord, scheduleRule, date);
        var editLockReason = AttendanceEditPolicy.lockReason(user.hireDate(), date);
        var busyReason = busyReason(
            assignment,
            dailyRecord,
            activeWorkSite,
            hasRangeAttendanceActivity,
            hasActiveWorkSiteOverlap,
            hasActiveScheduleOverlap
        );

        if (assignment != null) {
            item.put("schedule_template_id", assignment.templateId());
            item.put("schedule_template_name", displayScheduleTemplateName(assignment.templateName()));
            item.put("effective_start_date", assignment.effectiveStartDate().toString());
            item.put("effective_end_date", assignment.effectiveEndDate() == null ? null : assignment.effectiveEndDate().toString());
        }
        if (scheduleRule != null) {
            item.put("today_rule", toScheduleRuleMap(scheduleRule));
        }
        if (dailyRecord != null) {
            item.put("corrected_status", dailyRecord.correctedStatus());
            item.put("first_check_in_at", toIsoString(dailyRecord.firstCheckInAt()));
            item.put("last_check_out_at", toIsoString(dailyRecord.lastCheckOutAt()));
            item.put("first_location", toLocationMap(dailyRecord.firstLocation()));
            item.put("last_location", toLocationMap(dailyRecord.lastLocation()));
            item.put("minutes_late", dailyRecord.minutesLate());
        }
        if (activeWorkSite != null) {
            item.put("active_work_site", toWorkSiteAssignmentMap(activeWorkSite));
        }

        item.put("today_status", effectiveStatus);
        item.put("system_status", systemStatus);
        item.put("attendance_editable", editLockReason == null);
        item.put("edit_lock_reason", editLockReason);
        item.put("can_assign_schedule", busyReason.isBlank());
        item.put("schedule_busy_reason", busyReason.isBlank() ? null : busyReason);
        return item;
    }

    boolean hasAttendanceActivity(DailyRecordRow dailyRecord) {
        return dailyRecord != null && (dailyRecord.firstCheckInAt() != null || dailyRecord.lastCheckOutAt() != null);
    }

    private Map<String, Object> baseCandidateMap(AttendanceHrUser user) {
        var item = new LinkedHashMap<String, Object>();
        item.put("user_company_id", user.id());
        item.put("user_code", user.userCode());
        item.put("user_name", user.fullName());
        item.put("position_title", user.positionTitle());
        item.put("department", user.department());
        item.put("user_status", user.status());
        item.put("unit_id", user.unitId());
        item.put("unit_name", user.unitName());
        item.put("business_id", user.businessId());
        item.put("business_name", user.businessName());
        item.put("hire_date", dateString(user.hireDate()));
        item.put("schedule_template_id", null);
        item.put("schedule_template_name", null);
        item.put("effective_start_date", null);
        item.put("effective_end_date", null);
        item.put("today_rule", null);
        item.put("today_status", "not_scheduled");
        item.put("system_status", "not_scheduled");
        item.put("corrected_status", null);
        item.put("first_check_in_at", null);
        item.put("last_check_out_at", null);
        item.put("first_location", null);
        item.put("last_location", null);
        item.put("minutes_late", 0);
        item.put("allowed_locations", List.of());
        item.put("active_work_site", null);
        item.put("access_profile", null);
        item.put("latest_event", null);
        return item;
    }

    private String busyReason(
        ScheduleCandidateAssignment assignment,
        DailyRecordRow dailyRecord,
        ScheduleCandidateWorkSiteAssignment activeWorkSite,
        boolean hasRangeAttendanceActivity,
        boolean hasActiveWorkSiteOverlap,
        boolean hasActiveScheduleOverlap
    ) {
        var busyReason = "";
        if (assignment != null) {
            busyReason = "Schedule already assigned";
        }
        if (activeWorkSite != null) {
            busyReason = "Contract site assigned";
        }
        if (hasRangeAttendanceActivity || hasAttendanceActivity(dailyRecord)) {
            return "Attendance already recorded";
        }
        if (hasActiveWorkSiteOverlap) {
            return "Contract site assigned";
        }
        if (hasActiveScheduleOverlap) {
            return "Schedule already assigned";
        }
        return busyReason;
    }

    private Map<String, Object> toScheduleRuleMap(ScheduleRule rule) {
        var body = new LinkedHashMap<String, Object>();
        body.put("template_id", rule.templateId());
        body.put("schedule_mode", rule.scheduleMode());
        body.put("block_after_grace_period", false);
        body.put("enforce_location", rule.enforceLocation());
        body.put("location_id", rule.locationId());
        body.put("location_name", rule.locationName());
        body.put("start_time", rule.startTime() == null ? null : rule.startTime().toString());
        body.put("end_time", rule.endTime() == null ? null : rule.endTime().toString());
        body.put("meal_minutes", rule.mealMinutes());
        body.put("rest_minutes", rule.restMinutes());
        body.put("late_after_minutes", rule.lateAfterMinutes());
        body.put("is_rest_day", rule.isRestDay());
        body.put("is_overnight", isOvernightSchedule(rule));
        return body;
    }

    private Map<String, Object> toWorkSiteAssignmentMap(ScheduleCandidateWorkSiteAssignment assignment) {
        var body = new LinkedHashMap<String, Object>();
        body.put("id", assignment.id());
        body.put("user_company_id", assignment.userCompanyId());
        body.put("location_id", assignment.location().id());
        body.put("location_name", assignment.location().name());
        body.put("location", toLocationMap(assignment.location()));
        body.put("effective_start_date", assignment.effectiveStartDate().toString());
        body.put("effective_end_date", assignment.effectiveEndDate() == null ? null : assignment.effectiveEndDate().toString());
        body.put("status", assignment.status());
        return body;
    }

    private String displayScheduleTemplateName(String name) {
        var safeName = name == null ? "" : name.trim();
        if (safeName.toLowerCase().startsWith("template ")) {
            return safeName.substring("template ".length()).trim();
        }
        return safeName;
    }
}
