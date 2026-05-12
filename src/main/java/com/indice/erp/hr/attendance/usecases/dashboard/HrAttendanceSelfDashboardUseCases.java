package com.indice.erp.hr.attendance.usecases.dashboard;

import com.indice.erp.hr.attendance.models.AttendanceUser;
import com.indice.erp.hr.attendance.policy.AttendanceEditPolicy;
import com.indice.erp.hr.attendance.support.AttendanceLocationPresentation;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveEffectiveStatus;
import static com.indice.erp.hr.attendance.AttendanceSchedulePolicy.resolveSystemStatus;
import static com.indice.erp.hr.attendance.support.AttendanceLocationPresentation.toLocationMap;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.displayUserRole;
import static com.indice.erp.hr.attendance.support.AttendancePresentation.toIsoString;


public abstract class HrAttendanceSelfDashboardUseCases extends HrAttendanceDashboardUseCases {

    protected HrAttendanceSelfDashboardUseCases(AttendanceDependencies dependencies) {
        super(dependencies);
    }

    @Transactional
    public Map<String, Object> selfDashboard(long companyId, long userId, LocalDate date) {
        return buildUserDashboard(companyId, attendanceUserLookupService.loadAttendanceSessionUser(companyId, userId), date);
    }

    @Transactional
    public long resolveSelfUserCompanyId(long companyId, long userId) {
        return attendanceUserLookupService.resolveLinkedAttendanceUser(companyId, userId).id();
    }

    protected Map<String, Object> buildUserDashboard(long companyId, AttendanceUser user, LocalDate date) {
        var dailyRecord = attendanceDailyRecordRepository.loadUserDailyRecord(companyId, user.userId(), date);
        var effectiveStatus = resolveEffectiveStatus(dailyRecord, null, date);
        var locations = loadUserAttendanceLocations(companyId);
        var editLockReason = AttendanceEditPolicy.lockReason(null, date);

        var item = new LinkedHashMap<String, Object>();
        item.put("subject_type", "user");
        item.put("user_id", user.userId());
        item.put("user_company_id", user.userCompanyId());
        item.put("user_code", user.email());
        item.put("user_name", user.fullName());
        item.put("avatar_url", user.avatarUrl());
        item.put("position_title", displayUserRole(user.role()));
        item.put("department", "User account");
        item.put("unit_id", null);
        item.put("unit_name", "");
        item.put("business_id", null);
        item.put("business_name", "");
        item.put("hire_date", null);
        item.put("attendance_editable", editLockReason == null);
        item.put("edit_lock_reason", editLockReason);
        item.put("status", effectiveStatus);
        item.put("system_status", resolveSystemStatus(dailyRecord, null, date));
        item.put("corrected_status", dailyRecord != null ? dailyRecord.correctedStatus() : null);
        item.put("first_check_in_at", dailyRecord != null ? toIsoString(dailyRecord.firstCheckInAt()) : null);
        item.put("last_check_out_at", dailyRecord != null ? toIsoString(dailyRecord.lastCheckOutAt()) : null);
        item.put("first_location", dailyRecord != null ? toLocationMap(dailyRecord.firstLocation()) : null);
        item.put("last_location", dailyRecord != null ? toLocationMap(dailyRecord.lastLocation()) : null);
        item.put("minutes_late", dailyRecord != null ? dailyRecord.minutesLate() : 0);
        item.put("first_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.firstPhotoObjectKey()) : null);
        item.put("last_photo_url", dailyRecord != null ? attendancePhotoService.signedAttendancePhotoUrl(dailyRecord.lastPhotoObjectKey()) : null);

        var userPayload = new LinkedHashMap<String, Object>();
        userPayload.put("subject_type", "user");
        userPayload.put("id", user.userId());
        userPayload.put("user_id", user.userId());
        userPayload.put("user_company_id", user.userCompanyId());
        userPayload.put("user_code", user.email());
        userPayload.put("full_name", user.fullName());
        userPayload.put("avatar_url", user.avatarUrl());
        userPayload.put("position_title", displayUserRole(user.role()));
        userPayload.put("department", "User account");
        userPayload.put("unit_id", null);
        userPayload.put("unit_name", "");
        userPayload.put("hire_date", null);
        userPayload.put("status", user.status());

        var summary = new LinkedHashMap<String, Object>();
        summary.put("total_users", 1);
        summary.put("on_time_count", "on_time".equals(effectiveStatus) ? 1 : 0);
        summary.put("late_count", "late".equals(effectiveStatus) ? 1 : 0);
        summary.put("leave_count", "leave".equals(effectiveStatus) ? 1 : 0);
        summary.put("rest_count", "rest".equals(effectiveStatus) ? 1 : 0);
        summary.put("absence_count", "absence".equals(effectiveStatus) ? 1 : 0);
        summary.put("locations_count", locations.size());
        summary.put("kiosk_enabled", !locations.isEmpty());

        var body = new LinkedHashMap<String, Object>();
        body.put("date", date.toString());
        body.put("subject_type", "user");
        body.put("summary", summary);
        body.put("items", List.of(item));
        body.put("users", List.of(userPayload));
        body.put("locations", locations.stream().map(AttendanceLocationPresentation::toLocationMap).toList());
        return body;
    }
}
