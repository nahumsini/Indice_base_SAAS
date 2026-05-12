package com.indice.erp.hr.attendance.usecases.calendar;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import com.indice.erp.hr.attendance.usecases.dashboard.HrAttendanceSelfDashboardUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.dateString;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.displayUserRole;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;


public abstract class HrAttendanceCalendarUseCases extends HrAttendanceSelfDashboardUseCases {

    protected HrAttendanceCalendarUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    public Map<String, Object> userCalendar(long companyId, long userCompanyId, YearMonth month) {
        var user = attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        var startDate = month.atDay(1);
        var endDate = month.atEndOfMonth();
        var dailyRecords = attendanceDailyRecordRepository.loadDailyRecords(companyId, userCompanyId, startDate, endDate);
        var scheduleWindows = loadScheduleWindows(companyId, userCompanyId, startDate, endDate);
        var activeWorkSitesByDate = loadActiveWorkSiteAssignments(companyId, userCompanyId, startDate, endDate);

        var days = new ArrayList<Map<String, Object>>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var dailyRecord = dailyRecords.get(currentDate);
            var scheduleRule = resolveScheduleRule(scheduleWindows, currentDate);
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, scheduleRule, currentDate);
            var editLockReason = attendanceEditLockReason(user, currentDate);

            var day = new LinkedHashMap<String, Object>();
            day.put("date", currentDate.toString());
            day.put("day", currentDate.getDayOfMonth());
            day.put("attendance_editable", editLockReason == null);
            day.put("edit_lock_reason", editLockReason);
            day.put("effective_status", effectiveStatus);
            day.put("system_status", resolveSystemStatus(dailyRecord, scheduleRule, currentDate));
            day.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            day.put("entry_registered", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
            day.put("exit_registered", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
            day.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            day.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            day.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
            day.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            day.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            day.put("schedule_rule", scheduleRule == null ? null : toScheduleRuleMap(scheduleRule));
            var activeWorkSite = activeWorkSitesByDate.get(currentDate);
            day.put("active_work_site", activeWorkSite == null ? null : toWorkSiteAssignmentMap(activeWorkSite));
            day.put("first_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            day.put("last_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            day.put("notes", dailyRecord != null ? dailyRecord.notes() : null);
            days.add(day);
        }

        var body = new LinkedHashMap<String, Object>();
        var userPayload = new LinkedHashMap<String, Object>();
        userPayload.put("id", user.id());
        userPayload.put("full_name", user.fullName());
        userPayload.put("position_title", user.positionTitle());
        userPayload.put("department", user.department());
        userPayload.put("hire_date", dateString(user.hireDate()));
        body.put("user", userPayload);
        body.put("month", month.toString());
        body.put("items", days);
        return body;
    }

    protected Map<String, Object> userCalendar(long companyId, AttendanceUser user, YearMonth month) {
        var startDate = month.atDay(1);
        var endDate = month.atEndOfMonth();
        var dailyRecords = attendanceDailyRecordRepository.loadUserDailyRecords(companyId, user.userId(), startDate, endDate);

        var days = new ArrayList<Map<String, Object>>();
        for (var currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
            var dailyRecord = dailyRecords.get(currentDate);
            var effectiveStatus = resolveEffectiveStatus(dailyRecord, null, currentDate);
            var editLockReason = AttendanceEditPolicy.lockReason(null, currentDate);

            var day = new LinkedHashMap<String, Object>();
            day.put("date", currentDate.toString());
            day.put("day", currentDate.getDayOfMonth());
            day.put("attendance_editable", editLockReason == null);
            day.put("edit_lock_reason", editLockReason);
            day.put("effective_status", effectiveStatus);
            day.put("system_status", resolveSystemStatus(dailyRecord, null, currentDate));
            day.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
            day.put("entry_registered", dailyRecord != null && dailyRecord.firstCheckInAt() != null);
            day.put("exit_registered", dailyRecord != null && dailyRecord.lastCheckOutAt() != null);
            day.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
            day.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
            day.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
            day.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
            day.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
            day.put("schedule_rule", null);
            day.put("active_work_site", null);
            day.put("first_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
            day.put("last_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);
            day.put("notes", dailyRecord != null ? dailyRecord.notes() : null);
            days.add(day);
        }

        var userPayload = new LinkedHashMap<String, Object>();
        userPayload.put("subject_type", "user");
        userPayload.put("id", user.userId());
        userPayload.put("user_id", user.userId());
        userPayload.put("user_company_id", user.userCompanyId());
        userPayload.put("full_name", user.fullName());
        userPayload.put("avatar_url", user.avatarUrl());
        userPayload.put("position_title", displayUserRole(user.role()));
        userPayload.put("department", "User account");
        userPayload.put("hire_date", null);

        var body = new LinkedHashMap<String, Object>();
        body.put("subject_type", "user");
        body.put("user", userPayload);
        body.put("month", month.toString());
        body.put("items", days);
        return body;
    }

    @Transactional
    public Map<String, Object> selfCalendar(long companyId, long userId, YearMonth month) {
        return userCalendar(companyId, attendanceUserLookupService.loadAttendanceSessionUser(companyId, userId), month);
    }
}
