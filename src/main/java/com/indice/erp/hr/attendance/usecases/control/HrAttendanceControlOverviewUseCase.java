package com.indice.erp.hr.attendance.usecases.control;

import com.indice.erp.hr.attendance.kiosk.KioskDeviceRow;
import com.indice.erp.hr.attendance.models.AttendanceHrUser;
import com.indice.erp.hr.attendance.models.ControlActivityRow;
import com.indice.erp.hr.attendance.models.LocationRow;
import com.indice.erp.hr.attendance.models.WorkSiteAssignmentRow;
import com.indice.erp.hr.attendance.support.AttendanceLocationPresentation;
import com.indice.erp.hr.attendance.usecases.calendar.HrAttendanceCalendarUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.shared.HrPayloadUtils;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.calculateMinutesLate;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.dateString;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;
import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;


public abstract class HrAttendanceControlOverviewUseCase extends HrAttendanceCalendarUseCases {

    protected HrAttendanceControlOverviewUseCase(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> controlOverview(long companyId, LocalDate date) {
        var users = attendanceUserLookupService.listAttendanceUsers(companyId);
        var locations = listLocations(companyId);
        return controlOverview(
            companyId,
            date,
            users,
            locations,
            loadAllowedLocationsByUser(companyId),
            loadActiveWorkSiteAssignments(companyId, date),
            attendanceKioskDeviceRepository.list(companyId),
            loadRecentControlActivity(companyId, date, 25),
            loadControlPhotoObjectKeysByUser(companyId, date)
        );
    }

    protected Map<String, Object> controlOverview(
        long companyId,
        LocalDate date,
        List<AttendanceHrUser> users,
        List<LocationRow> locations,
        Map<Long, List<LocationRow>> allowedLocationsByUser,
        Map<Long, WorkSiteAssignmentRow> activeWorkSitesByUser,
        List<KioskDeviceRow> kioskDevices,
        List<ControlActivityRow> recentEvents,
        Map<Long, Map<String, String>> photoObjectKeysByUser
    ) {
        var visibleUserIds = users.stream().map(AttendanceHrUser::id).toList();
        var templates = loadScheduleTemplates(companyId);
        var currentAssignments = loadCurrentAssignments(companyId, date);
        var scheduleRulesByUser = loadScheduleRules(companyId, date);
        var dailyRecordsByUser = attendanceDailyRecordRepository.loadDailyRecords(companyId, date);
        var photoRetentionByUser = loadControlPhotoRetentionStateByUser(companyId, date, visibleUserIds);
        var businessLocationsByBusiness = groupLocationsByBusiness(locations);
        var accessProfilesByUser = attendanceAccessService.loadAccessProfilesByUser(companyId);
        var latestEventByUser = new HashMap<Long, ControlActivityRow>();
        int authSuccessCount = 0;
        int authFailureCount = 0;
        int overrideCount = 0;

        for (var recentEvent : recentEvents) {
            latestEventByUser.putIfAbsent(recentEvent.userCompanyId(), recentEvent);
            if ("auth_attempt".equals(recentEvent.eventKind())) {
                if ("success".equals(recentEvent.resultStatus()) || "overridden".equals(recentEvent.resultStatus())) {
                    authSuccessCount++;
                } else if ("failure".equals(recentEvent.resultStatus()) || "rejected".equals(recentEvent.resultStatus())) {
                    authFailureCount++;
                }
            }
            if ("manual_override".equals(recentEvent.authMethod()) || "overridden".equals(recentEvent.resultStatus())) {
                overrideCount++;
            }
        }

        var assignedCountsByTemplate = new HashMap<Long, Integer>();
        currentAssignments.values().stream()
            .filter((assignment) -> visibleUserIds.contains(assignment.userCompanyId()))
            .forEach((assignment) ->
                assignedCountsByTemplate.merge(assignment.templateId(), 1, Integer::sum)
            );

        int assignedUsersCount = 0;
        int unassignedUsersCount = 0;
        int lateTodayCount = 0;
        int manualCorrectionsCount = 0;
        int recordsTodayCount = 0;

        var assignmentsPayload = new ArrayList<Map<String, Object>>();
        for (var user : users) {
            var assignment = currentAssignments.get(user.id());
            var scheduleRule = scheduleRulesByUser.get(user.id());
            var dailyRecord = dailyRecordsByUser.get(user.id());
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, date);
            var systemStatus = resolveSystemStatus(dailyRecord, scheduleRule, date);
            var editLockReason = attendanceEditLockReason(user, date);

            if (assignment == null) {
                unassignedUsersCount++;
            } else {
                assignedUsersCount++;
            }

            if ("late".equals(effectiveStatus)) {
                lateTodayCount++;
            }

            if (dailyRecord != null && !HrPayloadUtils.isBlank(dailyRecord.correctedStatus())) {
                manualCorrectionsCount++;
            }

            if (dailyRecord != null && (dailyRecord.firstCheckInAt() != null || dailyRecord.lastCheckOutAt() != null)) {
                recordsTodayCount++;
            }

            var photoObjectKeys = photoObjectKeysByUser.get(user.id());
            var firstPhotoObjectKey = dailyRecord != null && !isBlank(dailyRecord.firstPhotoObjectKey())
                ? dailyRecord.firstPhotoObjectKey()
                : photoObjectKeys == null ? null : photoObjectKeys.get("first_check_in");
            var lastPhotoObjectKey = dailyRecord != null && !isBlank(dailyRecord.lastPhotoObjectKey())
                ? dailyRecord.lastPhotoObjectKey()
                : photoObjectKeys == null ? null : photoObjectKeys.get("last_check_out");
            var retentionState = photoRetentionByUser.getOrDefault(user.id(), new PhotoRetentionState());

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
            item.put("attendance_editable", editLockReason == null);
            item.put("edit_lock_reason", editLockReason);
            item.put("schedule_template_id", assignment != null ? assignment.templateId() : null);
            item.put("schedule_template_name", assignment != null ? displayScheduleTemplateName(assignment.templateName()) : null);
            item.put("effective_start_date", assignment != null ? assignment.effectiveStartDate().toString() : null);
            item.put("effective_end_date", assignment != null && assignment.effectiveEndDate() != null
                ? assignment.effectiveEndDate().toString()
                : null);
            item.put("today_rule", scheduleRule == null ? null : toScheduleRuleMap(scheduleRule));
            item.put("today_status", effectiveStatus);
            item.put("system_status", systemStatus);
            item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            item.put("first_photo_url", attendancePhotoService.signedAttendancePhotoUrl(firstPhotoObjectKey));
            item.put("last_photo_url", attendancePhotoService.signedAttendancePhotoUrl(lastPhotoObjectKey));
            item.put("first_photo_expired", retentionState.isExpired("check_in"));
            item.put("last_photo_expired", retentionState.isExpired("check_out"));
            item.put("first_photo_retained_until", retentionState.retainedUntil("check_in"));
            item.put("last_photo_retained_until", retentionState.retainedUntil("check_out"));
            item.put("first_latitude", dailyRecord != null ? dailyRecord.firstLatitude() : null);
            item.put("first_longitude", dailyRecord != null ? dailyRecord.firstLongitude() : null);
            item.put("last_latitude", dailyRecord != null ? dailyRecord.lastLatitude() : null);
            item.put("last_longitude", dailyRecord != null ? dailyRecord.lastLongitude() : null);
            item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : calculateMinutesLate(scheduleRule, null));
            item.put(
                "allowed_locations",
                allowedLocationsByUser.getOrDefault(user.id(), List.of()).stream().map(AttendanceLocationPresentation::toLocationMap).toList()
            );
            item.put(
                "business_locations",
                user.businessId() == null
                    ? List.of()
                    : businessLocationsByBusiness.getOrDefault(user.businessId(), List.of()).stream().map(AttendanceLocationPresentation::toLocationMap).toList()
            );
            var activeWorkSite = activeWorkSitesByUser.get(user.id());
            item.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
            var accessProfile = accessProfilesByUser.get(user.id());
            item.put("access_profile", accessProfile == null ? null : attendanceAccessService.toAccessProfileMap(accessProfile));
            var latestEvent = latestEventByUser.get(user.id());
            item.put("latest_event", latestEvent == null ? null : toControlActivityMap(latestEvent));
            assignmentsPayload.add(item);
        }

        var templatesPayload = new ArrayList<Map<String, Object>>();
        for (var template : templates) {
            var body = new LinkedHashMap<String, Object>();
            body.put("id", template.templateId());
            body.put("name", displayScheduleTemplateName(template.templateName()));
            body.put("status", template.status());
            body.put("users_assigned_count", assignedCountsByTemplate.getOrDefault(template.templateId(), 0));
            body.put("days", template.days().stream().map(this::toTemplateDayMap).toList());
            templatesPayload.add(body);
        }

        var summary = new LinkedHashMap<String, Object>();
        summary.put("users_count", users.size());
        summary.put("locations_count", locations.size());
        summary.put("templates_count", templates.size());
        summary.put("assigned_users_count", assignedUsersCount);
        summary.put("unassigned_users_count", unassignedUsersCount);
        summary.put("late_today_count", lateTodayCount);
        summary.put("manual_corrections_count", manualCorrectionsCount);
        summary.put("records_today_count", recordsTodayCount);
        summary.put("auth_success_count", authSuccessCount);
        summary.put("auth_failure_count", authFailureCount);
        summary.put("override_count", overrideCount);

        var body = new LinkedHashMap<String, Object>();
        body.put("date", date.toString());
        body.put("summary", summary);
        body.put("locations", locations.stream().map(AttendanceLocationPresentation::toLocationMap).toList());
        body.put("templates", templatesPayload);
        body.put("kiosk_devices", kioskDevices.stream().map(attendanceKioskDeviceMapper::toMap).toList());
        body.put("assignments", assignmentsPayload);
        body.put("recent_events", recentEvents.stream().map(this::toControlActivityMap).toList());
        return body;
    }
}
